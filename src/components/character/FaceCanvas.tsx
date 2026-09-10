import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./FaceCanvas.module.scss";
import Button from "../common/Button";

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

  // 현재 그리는 중인 stroke. state 대신 ref를 써서 같은 제스처 안에서
  // 항상 최신 path를 참조하고, 새 press마다 깨끗한 path에서 시작하도록 한다.
  const pathRef = useRef(new Path2D());

  // 여러 도형의 좌표 정보를 저장하는 상태 [[...], [...], [...]]
  const [savedPolygon, setSavedPolygon] = useState<Path2D[]>([]);
  // 되돌리기로 빼낸 stroke들. 새로 그리면 비워진다(되돌리기 취소 불가).
  const [redoStack, setRedoStack] = useState<Path2D[]>([]);

  const startDrawing = ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    pathRef.current = new Path2D(); // 새 stroke는 항상 새 path에서 시작
    pathRef.current.moveTo(offsetX, offsetY); // 시작점은 '누른 위치'로 고정
    setIsDrawing(true); // 그리기 상태 변경
  };

  // 마우스를 캔버스 위에서 움직이면(혹은 드래그) 실행되는 핸들러
  const drawing = ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
    // offsetX, offsetY는 이벤트가 걸려있는 DOM 객체를 기준으로 좌표 출력
    if (!isDrawing || !ctx) return; // 누르지 않은 상태에서는 아무것도 하지 않는다
    const { offsetX, offsetY } = nativeEvent;
    pathRef.current.lineTo(offsetX, offsetY); // 현재 좌표로 이어질 부분 설정
    ctx.stroke(pathRef.current); // 선 긋기(화면 출력)
  };

  // 마우스 클릭을 해제하면 실행되는 핸들러
  const finishDrawing = () => {
    if (!isDrawing) return; // pointerleave 등으로 중복 호출돼도 안전하게
    setIsDrawing(false); // 그리기 상태 변경
    // closePath()는 시작점과 끝점을 잇는 선을 추가하므로 자유선(freehand)에는 쓰지 않는다.
    // (redraw로 다시 그릴 때 그 연결선이 나타나던 버그의 원인)
    const finished = pathRef.current;
    setSavedPolygon((prev) => [...prev, finished]); // 완성한 도형의 좌표 정보를 배열에 저장
    setRedoStack([]); // 새로 그렸으므로 되돌리기 취소 이력은 폐기
    pathRef.current = new Path2D(); // 새로운 path 객체 생성
  };

  // 저장된 stroke 배열만으로 캔버스를 처음부터 다시 그린다
  const redraw = useCallback(
    (paths: Path2D[]) => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paths.forEach((p) => ctx.stroke(p));
    },
    [ctx],
  );

  // 마지막 stroke 하나를 제거하고 redoStack에 쌓은 뒤 다시 그린다
  const handleUndo = () => {
    if (savedPolygon.length === 0) return;
    const removed = savedPolygon[savedPolygon.length - 1];
    const next = savedPolygon.slice(0, -1);
    setSavedPolygon(next);
    setRedoStack((prev) => [...prev, removed]);
    redraw(next);
  };

  // 되돌리기 취소: redoStack의 마지막 stroke를 다시 savedPolygon으로 복원한다
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    const next = [...savedPolygon, restored];
    setRedoStack((prev) => prev.slice(0, -1));
    setSavedPolygon(next);
    redraw(next);
  };

  useEffect(() => {
    // 캔버스 사이즈 설정
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = document.getElementById("root")?.clientWidth ?? 0;
    canvas.width = width - 32; // 혹은 원하는 사이즈 px없이 숫자만 입력
    canvas.height = width - 32; // 혹은 원하는 사이즈 px없이 숫자만 입력

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
    <div className={styles.faceanvasPanel}>
      <div className={styles.faceCanvasHeader}>
        <p className={styles.faceCanvasTitle}>얼굴을 그려주세요</p>
      </div>
      <canvas
        ref={canvasRef}
        className="face-canvas"
        onPointerDown={startDrawing}
        onPointerUp={finishDrawing}
        onPointerMove={drawing}
        onPointerLeave={finishDrawing} // 캔버스를 벗어나면 stroke 종료(isDrawing이 true로 남는 것 방지)
      />
      <div className={styles.historyControls}>
        <button
          type="button"
          className={styles.undoButton}
          onClick={handleUndo}
          disabled={savedPolygon.length === 0}
          aria-label="되돌리기"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.undoButton}
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          aria-label="되돌리기 취소"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9a5 5 0 0 0 0 10h1" />
          </svg>
        </button>
      </div>
      <Button
        type="button"
        onClick={handleNext}
        disabled={savedPolygon.length === 0}
      >
        다음
      </Button>
    </div>
  );
}
