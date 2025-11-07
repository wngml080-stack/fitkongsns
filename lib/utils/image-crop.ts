/**
 * @file image-crop.ts
 * @description 이미지 크롭 유틸리티 함수
 *
 * 주요 기능:
 * - Canvas를 사용하여 이미지 크롭
 * - 1:1 정사각형 비율로 크롭
 * - Blob으로 변환하여 File 생성
 */

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 이미지를 크롭하여 Blob으로 변환
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context를 가져올 수 없습니다.");
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // 회전을 고려한 캔버스 크기 설정
  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // 이미지 그리기
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // 크롭 영역 설정
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("이미지 크롭에 실패했습니다."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.95
    );
  });
}

/**
 * 이미지 URL에서 Image 객체 생성
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

/**
 * Blob을 File로 변환
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

