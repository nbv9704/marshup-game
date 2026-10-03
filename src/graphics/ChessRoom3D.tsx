import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { legalMoves, type ChessMove, type ChessPiece, type ChessState, type PromotionKind } from '../games/chess/rules';
import type { ChessLanView } from '../lan/chess-session';
import { BOARD_SQUARE_SIZE, canStandAt, squarePosition } from './chessRoomMath';
import '../styles/chess3d.css';

interface Props {
  view: ChessLanView;
  seat: 'p1' | 'p2';
  canMove: boolean;
  reducedMotion: boolean;
  onMove: (move: ChessMove) => void;
}

const PIECE_NAME: Record<ChessPiece['kind'], string> = {
  king: 'Vua', queen: 'Hậu', rook: 'Xe', bishop: 'Tượng', knight: 'Mã', pawn: 'Tốt'
};
const PROMOTIONS: readonly PromotionKind[] = ['queen', 'rook', 'bishop', 'knight'];

type RoomObjects = {
  readonly scene: THREE.Scene;
  readonly squares: THREE.Mesh[];
  readonly pieces: THREE.Group;
  readonly hitObjects: THREE.Object3D[];
  readonly avatar: THREE.Group;
  readonly boardLight: THREE.PointLight;
  readonly geometries: readonly THREE.BufferGeometry[];
  readonly materials: readonly THREE.Material[];
};
type PieceGeometries = { orb: THREE.SphereGeometry; cylinder: THREE.CylinderGeometry;
  cone: THREE.ConeGeometry; torus: THREE.TorusGeometry; box: THREE.BoxGeometry };
type PieceMaterials = { white: THREE.Material; black: THREE.Material; gold: THREE.Material };

function addBox(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number],
  material: THREE.Material, geometries: THREE.BufferGeometry[], hit?: THREE.Object3D[]): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(...size);
  geometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  parent.add(mesh);
  hit?.push(mesh);
  return mesh;
}

function buildRoom(seat: Props['seat']): RoomObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1f2448');
  scene.fog = new THREE.Fog('#1f2448', 9, 24);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const material = (color: string, metalness = 0, roughness = 0.5, emissive = '#000000') => {
    const value = new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive });
    materials.push(value);
    return value;
  };
  const floor = material('#392c55', 0.1, 0.82), wall = material('#314e6d', 0.08, 0.68);
  const gold = material('#f7c66d', 0.5, 0.24), darkGold = material('#ae754a', 0.25, 0.45);
  const table = material('#75415d', 0.1, 0.43), felt = material('#174f61', 0.06, 0.85);
  const cyan = material('#62eced', 0.14, 0.38, '#094657');
  const pink = material('#ff77c7', 0.12, 0.38, '#512346');
  const white = material('#fff1d6', 0.16, 0.29), black = material('#54375f', 0.12, 0.34);
  const eyes = material('#2c2640', 0, 0.55);

  scene.add(new THREE.HemisphereLight('#fff1d5', '#44577b', 2.25));
  const key = new THREE.DirectionalLight('#fff2d0', 2.25);
  key.position.set(-3, 7, 5);
  scene.add(key);
  const boardLight = new THREE.PointLight('#82f4f3', 2.4, 8);
  boardLight.position.set(0, 3.3, 0);
  scene.add(boardLight);

  addBox(scene, [11, 0.25, 11], [0, -0.17, 0], floor, geometries);
  addBox(scene, [11, 4.7, 0.25], [0, 2.25, -5.5], wall, geometries);
  addBox(scene, [11, 4.7, 0.25], [0, 2.25, 5.5], wall, geometries);
  addBox(scene, [0.25, 4.7, 11], [-5.5, 2.25, 0], wall, geometries);
  addBox(scene, [0.25, 4.7, 11], [5.5, 2.25, 0], wall, geometries);
  for (const x of [-5.1, 5.1]) for (const z of [-5.1, 5.1]) {
    addBox(scene, [0.22, 4.4, 0.22], [x, 2.2, z], gold, geometries);
  }
  for (const z of [-5.35, 5.35]) {
    addBox(scene, [8.6, 0.08, 0.08], [0, 3.7, z], cyan, geometries);
    addBox(scene, [5.8, 0.5, 0.07], [0, 2.7, z], pink, geometries);
  }
  addBox(scene, [2.8, 0.12, 2.8], [0, 0.45, 0], darkGold, geometries);
  addBox(scene, [0.7, 0.85, 0.7], [0, 0.62, 0], gold, geometries);
  addBox(scene, [5.0, 0.25, 5.0], [0, 1.0, 0], table, geometries);
  addBox(scene, [4.68, 0.07, 4.68], [0, 1.16, 0], gold, geometries);
  addBox(scene, [4.44, 0.045, 4.44], [0, 1.21, 0], felt, geometries);

  const squares: THREE.Mesh[] = [], hitObjects: THREE.Object3D[] = [];
  for (let square = 0; square < 64; square++) {
    const { x, z } = squarePosition(square);
    const light = (Math.floor(square / 8) + square % 8) % 2 === 0;
    const tileMaterial = material(light ? '#f3dfbd' : '#477b87', 0.04, 0.74);
    const tile = addBox(scene, [BOARD_SQUARE_SIZE - 0.009, 0.035, BOARD_SQUARE_SIZE - 0.009],
      [x, 1.245, z], tileMaterial, geometries, hitObjects);
    tile.userData['square'] = square;
    tile.userData['light'] = light;
    squares.push(tile);
  }

  const avatar = new THREE.Group();
  avatar.position.set(0, 0, seat === 'p1' ? -4.25 : 4.25);
  scene.add(avatar);
  const orb = new THREE.SphereGeometry(1, 12, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const cone = new THREE.ConeGeometry(1, 1, 12);
  const torus = new THREE.TorusGeometry(1, 0.16, 6, 16);
  geometries.push(orb, cylinder, cone, torus);
  function part(parent: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material,
    position: [number, number, number], scale: [number, number, number]) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
  }
  part(avatar, cylinder, seat === 'p1' ? pink : cyan, [0, 0.62, 0], [0.38, 0.59, 0.32]);
  part(avatar, orb, white, [0, 1.55, 0], [0.43, 0.43, 0.42]);
  part(avatar, orb, eyes, [-0.14, 1.62, seat === 'p1' ? 0.38 : -0.38], [0.048, 0.065, 0.03]);
  part(avatar, orb, eyes, [0.14, 1.62, seat === 'p1' ? 0.38 : -0.38], [0.048, 0.065, 0.03]);
  part(avatar, cone, gold, [0, 2.09, 0], [0.28, 0.24, 0.28]);
  for (const x of [-0.5, 0.5]) part(avatar, orb, white, [x, 0.95, 0], [0.15, 0.38, 0.15]);

  const pieces = new THREE.Group();
  scene.add(pieces);
  const pieceGeometries = { orb, cylinder, cone, torus, box: new THREE.BoxGeometry(1, 1, 1) };
  geometries.push(pieceGeometries.box);
  pieces.userData['pieceGeometries'] = pieceGeometries;
  pieces.userData['pieceMaterials'] = { white, black, gold };
  return { scene, squares, pieces, hitObjects, avatar, boardLight, geometries, materials };
}

function rebuildPieces(room: RoomObjects, board: readonly (ChessPiece | null)[]): void {
  const { orb, cylinder, cone, torus, box } = room.pieces.userData['pieceGeometries'] as PieceGeometries;
  const { white, black, gold } = room.pieces.userData['pieceMaterials'] as PieceMaterials;
  room.pieces.clear();
  room.hitObjects.splice(64);
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material,
    y: number, sx: number, sy: number, sz: number, x = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
  };
  board.forEach((piece, square) => {
    if (!piece) return;
    const group = new THREE.Group();
    const position = squarePosition(square);
    group.position.set(position.x, 1.27, position.z);
    group.userData['square'] = square;
    const body = piece.color === 'white' ? white : black;
    add(group, cylinder, gold, 0.035, 0.205, 0.035, 0.205);
    add(group, cylinder, body, 0.115, 0.15, 0.085, 0.15);
    const tall = piece.kind === 'king' || piece.kind === 'queen';
    add(group, cylinder, body, 0.25, tall ? 0.122 : 0.108, tall ? 0.15 : 0.105, tall ? 0.122 : 0.108);
    if (piece.kind === 'pawn') add(group, orb, body, 0.38, 0.11, 0.11, 0.11);
    if (piece.kind === 'rook') {
      add(group, cylinder, body, 0.38, 0.145, 0.07, 0.145);
      add(group, box, gold, 0.45, 0.24, 0.045, 0.24);
    }
    if (piece.kind === 'knight') {
      add(group, cone, body, 0.41, 0.15, 0.17, 0.12, 0.03);
      add(group, orb, gold, 0.47, 0.045, 0.045, 0.045, 0.11);
    }
    if (piece.kind === 'bishop') {
      add(group, cone, body, 0.45, 0.15, 0.17, 0.15);
      add(group, orb, gold, 0.61, 0.045, 0.045, 0.045);
    }
    if (piece.kind === 'queen') {
      add(group, cone, body, 0.48, 0.17, 0.16, 0.17);
      add(group, torus, gold, 0.63, 0.12, 0.12, 0.12);
      add(group, orb, gold, 0.66, 0.065, 0.065, 0.065);
    }
    if (piece.kind === 'king') {
      add(group, cylinder, body, 0.48, 0.145, 0.12, 0.145);
      add(group, box, gold, 0.66, 0.042, 0.15, 0.04);
      add(group, box, gold, 0.69, 0.125, 0.04, 0.04);
    }
    room.pieces.add(group);
    room.hitObjects.push(...group.children);
  });
}

export function ChessRoom3D({ view, seat, canMove, reducedMotion, onMove }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const room = useRef<RoomObjects | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [selected, setSelected] = useState<number | null>(null);
  const [focus, setFocus] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [promotion, setPromotion] = useState<readonly ChessMove[] | null>(null);
  const legal = useMemo(() => canMove && view.state.phase === 'playing' && view.state.activePlayer === seat
    ? legalMoves({ ...view.state, positionCounts: {} } as ChessState) : [], [canMove, view, seat]);
  const legalRef = useRef(legal);
  legalRef.current = legal;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => { setSelected(null); setPromotion(null); }, [view.revision]);
  useEffect(() => {
    const current = room.current;
    if (!current) return;
    rebuildPieces(current, view.state.board);
  }, [view.state.board]);
  useEffect(() => {
    const current = room.current;
    if (!current) return;
    const targets = selected === null ? [] : legal.filter(move => move.from === selected).map(move => move.to);
    current.squares.forEach((tile, square) => {
      const base = tile.userData['light'] ? '#f3dfbd' : '#477b87';
      (tile.material as THREE.MeshStandardMaterial).color.set(selected === square ? '#ffdb75' :
        targets.includes(square) ? '#7ef8ac' : base);
    });
  }, [selected, legal]);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
    catch { setError('Không tạo được WebGL. Hãy cập nhật driver đồ họa hoặc dùng bàn cờ 2D.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);
    const built = buildRoom(seat);
    room.current = built;
    rebuildPieces(built, view.state.board);
    const camera = new THREE.PerspectiveCamera(68, 1, 0.07, 30);
    const standing = new THREE.Vector3(0, 1.72, seat === 'p1' ? 4.6 : -4.6);
    camera.position.copy(standing);
    let yaw = seat === 'p1' ? 0 : Math.PI, pitch = -0.13;
    const keys = new Set<string>();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let frame = 0;
    let disposed = false;
    const resize = () => {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const pick = (event: PointerEvent) => {
      if (pausedRef.current || !legalRef.current.length) return;
      const locked = document.pointerLockElement === renderer.domElement;
      if (!focusRef.current && !locked) { void renderer.domElement.requestPointerLock(); return; }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(locked ? 0 : ((event.clientX - rect.left) / rect.width) * 2 - 1,
        locked ? 0 : -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(built.hitObjects, false)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !Number.isInteger(object.userData['square'])) object = object.parent;
      if (!object) return;
      const square = object.userData['square'] as number;
      const from = selectedRef.current;
      if (from !== null) {
        const options = legalRef.current.filter(move => move.from === from && move.to === square);
        if (options.length > 1) { setPromotion(options); return; }
        if (options.length === 1) { onMoveRef.current(options[0]!); setSelected(null); return; }
      }
      setSelected(legalRef.current.some(move => move.from === square) ? square : null);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      keys.add(key);
      if (key === 'f' || key === ' ') {
        event.preventDefault();
        if (event.repeat) return;
        setFocus(previous => !previous);
        document.exitPointerLock();
      }
      if (key === 'escape') { setPaused(true); document.exitPointerLock(); }
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const mouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement || focusRef.current) return;
      yaw -= event.movementX * 0.002;
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.3, 1.3);
    };
    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.04);
      if (!focusRef.current && !pausedRef.current) {
        const speed = (keys.has('shift') ? 3.7 : 2.35) * dt;
        const forward = Number(keys.has('w')) - Number(keys.has('s'));
        const strafe = Number(keys.has('d')) - Number(keys.has('a'));
        const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
        const dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * strafe) * speed;
        if (canStandAt(standing.x + dx, standing.z)) standing.x += dx;
        if (canStandAt(standing.x, standing.z + dz)) standing.z += dz;
      }
      const target = focusRef.current ? new THREE.Vector3(0, 6.1, seat === 'p1' ? 2.4 : -2.4) : standing;
      camera.position.lerp(target, reducedMotion ? 1 : Math.min(1, dt * 7));
      if (focusRef.current) camera.lookAt(0, 1.15, 0);
      else camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch),
        camera.position.y + Math.sin(pitch), camera.position.z - Math.cos(yaw) * Math.cos(pitch));
      if (!reducedMotion) built.avatar.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.12;
      renderer.render(built.scene, camera);
      frame = requestAnimationFrame(tick);
    };
    renderer.domElement.addEventListener('pointerdown', pick);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('mousemove', mouseMove);
    tick();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pick);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('mousemove', mouseMove);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      built.geometries.forEach(geometry => geometry.dispose());
      built.materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      room.current = null;
    };
    // The scene is rebuilt only if the local seat changes; snapshots update meshes separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat, reducedMotion]);

  return <div className="chess3d-shell">
    <div className="chess3d-canvas" ref={mount} aria-label="Phòng cờ vua 3D"/>
    <div className="chess3d-hud"><span className="chess3d-pill">{seat === 'p1' ? 'QUÂN TRẮNG' : 'QUÂN ĐEN'} · {view.state.phase === 'completed' ? 'KẾT THÚC' : view.state.activePlayer === seat ? 'LƯỢT CỦA BẠN' : 'ĐỢI ĐỐI THỦ'}</span>
      {view.state.inCheck && <span className="chess3d-pill danger">CHIẾU!</span>}
      <button className="button primary" onClick={() => { setFocus(value => !value); document.exitPointerLock(); }}>{focus ? 'GÓC NHÌN TỰ DO · F' : 'FOCUS BOARD · F'}</button></div>
    {!focus && !paused && <div className="chess3d-crosshair" aria-hidden="true">＋</div>}
    <div className="chess3d-instructions">{focus ? 'Click quân và ô phát sáng để đi' : 'Click để khóa chuột · WASD di chuyển · Shift chạy · F nhìn bàn · Esc tạm dừng'}</div>
    {selected !== null && <div className="chess3d-selection">Đã chọn {PIECE_NAME[view.state.board[selected]?.kind ?? 'pawn']} · {legal.filter(move => move.from === selected).length} nước hợp lệ</div>}
    {promotion && <div className="chess3d-overlay"><div className="panel chess3d-dialog"><h2>Phong cấp quân tốt</h2><div className="button-row">{PROMOTIONS.map(kind => <button key={kind} className="button primary" onClick={() => { const move = promotion.find(option => option.promotion === kind); if (move) onMove(move); setPromotion(null); setSelected(null); }}>{PIECE_NAME[kind]}</button>)}</div></div></div>}
    {paused && <div className="chess3d-overlay"><div className="panel chess3d-dialog"><h2>Tạm dừng</h2><p>Ván vẫn tiếp tục nếu đang chơi LAN.</p><button className="button primary" onClick={() => setPaused(false)}>TIẾP TỤC</button></div></div>}
    {error && <div className="chess3d-overlay"><div className="panel chess3d-dialog" role="alert">{error}</div></div>}
  </div>;
}
