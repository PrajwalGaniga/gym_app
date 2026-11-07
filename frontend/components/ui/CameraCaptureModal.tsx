'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './camera.module.css';
import { Button } from './Button';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setIsInitializing(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      let msg = 'Unable to access camera device.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in your browser bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware found on this device.';
      }
      setCameraError(msg);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
    }

    return () => {
      stopTracks();
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally to match mirrored preview
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreview(url);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
  };

  const handleConfirm = () => {
    if (!capturedBlob || !capturedPreview) return;
    const file = new File([capturedBlob], `camera_${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    onCapture(file, capturedPreview);
    stopTracks();
    onClose();
  };

  const handleClose = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    stopTracks();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.cameraModalOverlay} onClick={handleClose}>
      <div className={styles.cameraModalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.cameraHeader}>
          <h3 className={styles.cameraTitle}>📸 Capture Member Photo</h3>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Viewfinder or Preview */}
        {cameraError ? (
          <div className={styles.errorBox}>
            <div className={styles.errorTitle}>Camera Not Available</div>
            <div className={styles.errorDesc}>{cameraError}</div>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Upload Image File Instead
            </Button>
          </div>
        ) : (
          <div className={styles.viewfinderContainer}>
            {capturedPreview ? (
              <img src={capturedPreview} alt="Captured Preview" className={styles.previewImage} />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.videoElement}
                />
                <div className={styles.viewfinderGuide} />
                <div className={styles.guideText}>
                  {isInitializing ? 'Connecting camera...' : 'Center face inside circle'}
                </div>
              </>
            )}
          </div>
        )}

        {/* Controls */}
        {!cameraError && (
          <div className={styles.cameraControls}>
            {capturedPreview ? (
              <>
                <button type="button" className={styles.retakeBtn} onClick={handleRetake}>
                  🔄 Retake
                </button>
                <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
                  ✅ Use Photo
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.captureBtn}
                onClick={handleCapture}
                disabled={isInitializing}
              >
                📸 Snap Photo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

