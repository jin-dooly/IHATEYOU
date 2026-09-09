import { useCallback, useEffect, useRef, useState } from "react";

export interface FacePoint {
  x: number;
  y: number;
}

interface FaceCanvasProps {
  onNext: (faceImage: string) => void;
}

export function FaceCanvas({ onNext }: FaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D>();

  const [isDrawing, setIsDrawing] = useState(false); // 그리기 상태 설정
  const [path, setPath2D] = useState(new Path2D()); // path 객체 생성

  // 여러 도형의 좌표 정보를 저장하는 상태 [[...], [...], [...]]
  const [savedPolygon, setSavedPolygon] = useState<Path2D[]>([]);

  const startDrawing = ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true); // 그리기 상태 변경
    console.log("start offset: ", offsetX, offsetY);
  }; // 마우스를 캔버스 위에서 움직이면(혹은 드래그) 실행되는 핸들러
  const drawing = ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
    // offsetX, offsetY는 이벤트가 걸려있는 DOM 객체를 기준으로 좌표 출력
    const { offsetX, offsetY } = nativeEvent;
    if (ctx) {
      if (!isDrawing) {
        // 클릭하지 않은 상태라면
        path.moveTo(offsetX, offsetY); // 시작점 설정
      } else {
        // 클릭한 상태라면
        path.lineTo(offsetX, offsetY); // 시작점에서(혹은 현재 좌표) 이어질 부분 설정
        ctx.stroke(path); // 선 긋기(화면 출력)
      }
    }
  }; // 마우스 클릭을 해제하면 실행되는 핸들러
  const finishDrawing = () => {
    setIsDrawing(false); // 그리기 상태 변경
    path.closePath(); // 선 종료 선언(시작점과 끝점을 자동으로 연결한다)
    setPath2D(new Path2D()); // 새로운 path 객체 생성
    setSavedPolygon([...savedPolygon, path]); // 완성한 도형의 좌표 정보를 배열에 저장
  };

  useEffect(() => {
    // 캔버스 사이즈 설정
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = document.getElementById("root")?.clientWidth ?? 0;
    canvas.width = width - 80; // 혹은 원하는 사이즈 px없이 숫자만 입력
    canvas.height = width - 80; // 혹은 원하는 사이즈 px없이 숫자만 입력

    // 캔버스 context 접근 후 기본 설정
    const context = canvas.getContext("2d"); // "그리기 메서드와 속성을 갖는" 2차원 드로잉 컨텍스트 참조
    if (!context) return;
    context.strokeStyle = "black"; // line 색
    context.lineWidth = 15; // line 굵기
    context.lineJoin = "round"; // 선 연결 모양(기본 값 miter 일반 모양)
    context.lineCap = "round"; // 선 끝 모양
    context.save(); // 드로잉 컨텍스트 설정 저장
    setCtx(context); // 설정한 드로잉 컨텍스트를 상태로 저장
  }, []);

  function handleNext() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onNext(canvas.toDataURL("image/png"));
  }

  return (
    <div className="face-canvas-panel">
      <p className="face-canvas-title">얼굴을 그려주세요</p>
      <canvas
        ref={canvasRef}
        className="face-canvas"
        onPointerDown={startDrawing}
        onPointerUp={finishDrawing}
        onPointerMove={drawing}
        // onMouseLeave={finishDrawing} // 마우스가 이벤트 영역 벗어났을 때
      />
      <button
        type="button"
        className="primary-button face-canvas-next"
        onClick={handleNext}
        disabled={savedPolygon.length === 0}
      >
        다음
      </button>
    </div>
  );
}
