import os
import uuid
import io
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from PIL import Image, ImageOps
from app.core.config import settings
from app.core.logging import logger

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB max intake for high-res modern smartphone cameras

class ImageService:
    def __init__(self):
        # Ensure local upload directories exist
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.upload_dir = base_dir / settings.UPLOAD_DIR
        self.thumb_dir = self.upload_dir / "thumbs"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.thumb_dir.mkdir(parents=True, exist_ok=True)

    def validate_and_process_image(self, file_bytes: bytes, filename: str) -> Tuple[bytes, bytes, str]:
        """
        Validates image content using PIL (magic bytes inspection).
        Automatically corrects mobile camera orientation (EXIF transpose),
        downscales high-res images to max 1000x1000, and compresses down
        to lightweight, web-optimized JPEG format (~100-250 KB) to save storage.
        Returns (optimized_image_bytes, thumbnail_bytes, format_ext).
        """
        if len(file_bytes) > MAX_FILE_SIZE:
            raise ValueError("Image file size exceeds maximum limit of 25 MB.")

        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
            # Reopen because verify() consumes image
            img = Image.open(io.BytesIO(file_bytes))
        except Exception:
            raise ValueError("Invalid or corrupted image file.")

        img_format = (img.format or "").upper()
        if img_format not in ALLOWED_FORMATS:
            raise ValueError(f"Unsupported image format: {img_format}. Allowed formats: JPEG, PNG, WebP.")

        # Automatically orient photo according to EXIF tags (fixes phone camera sideways/inverted rotation)
        try:
            transposed = ImageOps.exif_transpose(img)
            if transposed is not None:
                img = transposed
        except Exception:
            pass

        # Convert RGBA/P/other modes to RGB for consistent, high-efficiency JPEG compression
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Downscale large original images to max 1000x1000 maintaining aspect ratio
        if img.width > 1000 or img.height > 1000:
            img.thumbnail((1000, 1000), Image.Resampling.LANCZOS)

        # Save optimized main image with high-efficiency JPEG compression (quality 82, optimize)
        main_out = io.BytesIO()
        img.save(main_out, format="JPEG", quality=82, optimize=True)
        main_bytes = main_out.getvalue()

        # Generate 150x150 thumbnail
        thumb_img = img.copy()
        thumb_img.thumbnail((150, 150), Image.Resampling.LANCZOS)
        thumb_out = io.BytesIO()
        thumb_img.save(thumb_out, format="JPEG", quality=75, optimize=True)
        thumb_bytes = thumb_out.getvalue()

        ext = "jpg"
        return main_bytes, thumb_bytes, ext

    async def save_profile_photo(self, file_bytes: bytes, original_filename: str) -> Dict[str, Any]:
        """
        Saves photo to Cloudinary if configured; otherwise saves to local upload disk directory.
        """
        main_bytes, thumb_bytes, ext = self.validate_and_process_image(file_bytes, original_filename)
        random_id = uuid.uuid4().hex
        
        # Check if Cloudinary is configured
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
            try:
                import cloudinary
                import cloudinary.uploader
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True
                )
                upload_res = cloudinary.uploader.upload(
                    io.BytesIO(main_bytes),
                    folder="gym_profiles",
                    public_id=f"profile_{random_id}",
                    overwrite=True
                )
                url = upload_res.get("secure_url")
                # Auto-generate thumbnail url via Cloudinary transformation
                thumb_url = url.replace("/upload/", "/upload/c_thumb,w_150,h_150,g_face/")
                return {
                    "url": url,
                    "thumbnail_url": thumb_url,
                    "storage_key": upload_res.get("public_id"),
                    "content_type": f"image/{ext}",
                    "size_bytes": len(main_bytes)
                }
            except Exception as e:
                logger.warning(f"Cloudinary upload failed: {e}. Falling back to local storage.")

        # Local storage fallback
        main_filename = f"{random_id}.{ext}"
        thumb_filename = f"{random_id}_thumb.{ext}"
        
        main_path = self.upload_dir / main_filename
        thumb_path = self.thumb_dir / thumb_filename
        
        with open(main_path, "wb") as f:
            f.write(main_bytes)
        with open(thumb_path, "wb") as f:
            f.write(thumb_bytes)
            
        url = f"/static/uploads/profiles/{main_filename}"
        thumb_url = f"/static/uploads/profiles/thumbs/{thumb_filename}"
        
        return {
            "url": url,
            "thumbnail_url": thumb_url,
            "storage_key": main_filename,
            "content_type": f"image/{ext}",
            "size_bytes": len(main_bytes)
        }

image_service = ImageService()

