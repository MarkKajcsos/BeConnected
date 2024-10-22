import React, { useContext, useRef, useState, useEffect } from 'react';
import { MomentContext } from '../context/moment';
import Webcam from 'react-webcam';
import { TakePhotoActions, TakePhotoSteps } from '../context/moment.reducer';
import { Button, Flex } from '@chakra-ui/react';

export const Camera: React.FC = () => {
  const webcamRef = useRef<null | Webcam>(null);
  const frontWebcamRef = useRef<null | Webcam>(null); // Front camera reference
  const { appState, dispatchAppStateAction } = useContext(MomentContext);
  // biome-ignore lint: facingMode used in html block
  const { step, facingMode } = appState;
  const [isMobile, setIsMobile] = useState(false); // State to track if the device is mobile

  // Detect mobile device
  const detectMobile = () => {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
  };

  // Set whether the device is mobile
  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  // Merge two photos into one (in BeReal style)
  const mergePhotos = async (
    rearPhoto: any,
    frontPhoto: any
  ): Promise<string> => {
    const rearImage = new Image();
    const frontImage = new Image();

    rearImage.src = rearPhoto;
    frontImage.src = frontPhoto;

    return new Promise((resolve) => {
      rearImage.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match rear image
        canvas.width = rearImage.width;
        canvas.height = rearImage.height;

        // Draw rear image
        ctx!.drawImage(rearImage, 0, 0);

        // Scale and position front image in top left
        const frontWidth = rearImage.width * 0.3;
        const frontHeight = frontImage.height * (frontWidth / frontImage.width);
        ctx!.drawImage(frontImage, 0, 0, frontWidth, frontHeight);

        // Get merged image as a data URL
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  const captureEnv = () => {
    const rearScreenshot = webcamRef.current?.getScreenshot() || '';
    const frontScreenshot = frontWebcamRef.current?.getScreenshot() || '';

    // For mobile website
    if (isMobile) {
      if (rearScreenshot && frontScreenshot) {
        mergePhotos(rearScreenshot, frontScreenshot).then((mergedPhoto) => {
          dispatchAppStateAction({
            type: TakePhotoActions.RECORD_MOMENT_ENV,
            data: mergedPhoto,
          });
        });
      } else {
        console.error('Failed to capture both rear and front camera photos.');
      }
    } else {
      // For desktop website
      dispatchAppStateAction({
        type: TakePhotoActions.RECORD_MOMENT_ENV,
        data: rearScreenshot,
      });
    }
  };

  const cameraLoaded = () => {
    if (step === TakePhotoSteps.Initialize) {
      dispatchAppStateAction({ type: TakePhotoActions.INITIALIZED });
    }
  };

  return (
    <>
      <Webcam
        ref={webcamRef}
        audio={false}
        forceScreenshotSourceSize={true}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: 'environment' }} // Rear camera
        onUserMedia={cameraLoaded}
      />
      {isMobile && (
        <Webcam
          ref={frontWebcamRef}
          audio={false}
          forceScreenshotSourceSize={true}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user' }} // Front camera
          onUserMedia={cameraLoaded}
          style={{ display: 'none' }}
        />
      )}
      <Flex position="absolute" bottom={8} w="100%" justifyContent="center">
        <Button size="lg" onClick={captureEnv} colorScheme="teal">
          Shooot!
        </Button>
      </Flex>
    </>
  );
};
