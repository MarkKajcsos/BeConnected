import b64toBlob from 'b64-to-blob';
import axios from 'axios';

export const getS3UrlFromUrl = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const uploadUrl = queryParams.get('uploadUrl');
  return uploadUrl;
};

const convertBase64ToBlob = (base64String: string) => {
  return b64toBlob(base64String, 'image/jpeg');
};

export const postImage = async (base64Image: string, s3UploadUrl: string) => {
  try {
    const blob = convertBase64ToBlob(base64Image.split(',')[1]);
    const result = await axios.put(s3UploadUrl, blob, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
    console.log('Image uploaded successfully:', result.data);
  } catch (error) {
    console.error('Error uploading image:', error);
  }
};
