// Hero Cobogó em three.js — carregado sob demanda (import dinâmico) só quando essa variação está ativa.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { design, mulberry, SHAPES, type TileDesign } from "@/lib/cobogo";

export type CobogoStage = {
  /** Progresso da rolagem do hero (0–1), escrito pelo ScrollTrigger. */
  progress: number;
  intro: () => void;
  destroy: () => void;
};

const isMobile = () => window.innerWidth < 760;

type Tile = {
  mesh: THREE.Mesh;
  front: THREE.MeshPhysicalMaterial;
  x: number;
  y: number;
  c: number;
  r: number;
  k: number;
  vis: number;
  van: number;
  rot: number;
  hold: number;
  intro: number;
  wob: number;
};

/** Peças cerâmicas esmaltadas com os padrões da marca; viram e revelam a foto do projeto. */
export function cobogo(el: HTMLElement, photo: string): CobogoStage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = "gl";
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const mouse = new THREE.Vector2(0, 0);
  const mouseS = new THREE.Vector2(0, 0);
  let pointer = false;
  let visible = true;
  let raf = 0;
  let dist = 20;
  const t0 = performance.now();

  const texCache = new Map<string, THREE.CanvasTexture>();
  const faceTex = (d: TileDesign) => {
    const bg = d.alt ? "#F3E6D8" : "#2A1309";
    const fg = d.alt ? (d.idx < 5 ? "#592D1D" : d.fg) : d.fg;
    const key = d.kind + d.rot + bg + fg;
    const hit = texCache.get(key);
    if (hit) return hit;
    const s = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const x = cv.getContext("2d")!;
    x.fillStyle = bg;
    x.fillRect(0, 0, s, s);
    x.save();
    x.translate(s / 2, s / 2);
    x.rotate((d.rot * Math.PI) / 2);
    x.translate(-s / 2, -s / 2);
    x.scale(s / 100, s / 100);
    x.fillStyle = fg;
    x.fill(new Path2D(SHAPES[d.kind]));
    x.restore();
    // esmalte: leve variação de tom e granulado, como cerâmica feita à mão
    const g = x.createRadialGradient(s * 0.3, s * 0.25, 0, s * 0.5, s * 0.5, s * 0.8);
    g.addColorStop(0, "rgba(255,240,220,.10)");
    g.addColorStop(1, "rgba(0,0,0,.10)");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    const rnd = mulberry(key.length * 31 + d.rot);
    for (let k = 0; k < 900; k++) {
      x.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)";
      x.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texCache.set(key, t);
    return t;
  };

  const photoTex = new THREE.TextureLoader().load(photo, () => layout());
  photoTex.colorSpace = THREE.SRGBColorSpace;
  photoTex.anisotropy = 8;
  const side = new THREE.MeshStandardMaterial({ color: 0x3a1a0c, roughness: 0.7 });
  const back = new THREE.MeshPhysicalMaterial({ map: photoTex, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.35 });

  scene.add(new THREE.HemisphereLight(0xffe7cc, 0x2a1209, 0.7));
  const key = new THREE.DirectionalLight(0xffd6a0, 1.5);
  key.position.set(-7, 9, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);
  const torch = new THREE.PointLight(0xf9a226, 0, 10, 1.4);
  torch.position.set(0, 0, 2.4);
  scene.add(torch);

  // parede de fundo (rejunte) que recebe as sombras das peças
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x120400, roughness: 0.95, transparent: true });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), wallMat);
  wall.position.z = -0.12;
  wall.receiveShadow = true;
  scene.add(wall);

  const grid = new THREE.Group();
  scene.add(grid);
  let tiles: Tile[] = [];
  let cols = 0;
  let rows = 0;

  const layout = () => {
    tiles.forEach((t) => {
      t.mesh.geometry.dispose();
      grid.remove(t.mesh);
      t.front.dispose();
    });
    tiles = [];
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    const asp = w / h;
    cols = isMobile() ? 6 : asp > 1.6 ? 14 : 11;
    rows = Math.ceil(cols / asp) + 1;
    const gap = 0.07, size = 1, depth = 0.16;
    const totalH = rows * (size + gap), totalW = cols * (size + gap);
    const fovR = THREE.MathUtils.degToRad(camera.fov / 2);
    dist = Math.min(totalH / 2 / Math.tan(fovR), totalW / 2 / Math.tan(fovR) / asp) * 0.97;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    const sc = key.shadow.camera;
    sc.left = -totalW / 2 - 2;
    sc.right = totalW / 2 + 2;
    sc.top = totalH / 2 + 2;
    sc.bottom = -totalH / 2 - 2;
    sc.updateProjectionMatrix();
    const img = photoTex.image as HTMLImageElement | undefined;
    const ia = img?.width ? img.width / img.height : 1.5;
    const ga = totalW / totalH;
    let su = 1, sv = 1;
    if (ga > ia) sv = ia / ga;
    else su = ga / ia;
    const ou = (1 - su) / 2, ov = (1 - sv) / 2;
    const base = new RoundedBoxGeometry(size, size, depth, 3, 0.05);
    const nFace = base.attributes.position.count / 6;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const geo = base.clone();
        const pos = geo.attributes.position, uv = geo.attributes.uv;
        for (let k = 0; k < pos.count; k++) {
          const lx = pos.getX(k) / size + 0.5, ly = pos.getY(k) / size + 0.5, face = Math.floor(k / nFace);
          if (face === 4) uv.setXY(k, lx, ly); // frente: a peça desenhada
          else if (face === 5) uv.setXY(k, ou + su * ((c + 1 - lx) / cols), ov + sv * ((r + ly) / rows)); // verso: o pedaço da foto
        }
        uv.needsUpdate = true;
        const d = design(c, rows - 1 - r);
        const front = new THREE.MeshPhysicalMaterial({ map: faceTex(d), roughness: 0.55, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.18 });
        const mesh = new THREE.Mesh(geo, [side, side, side, side, front, back]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const x = (c - (cols - 1) / 2) * (size + gap), y = (r - (rows - 1) / 2) * (size + gap);
        mesh.position.set(x, y, 0);
        grid.add(mesh);
        const hr = mulberry(c * 131 + r * 7)();
        const nx = (c + 0.5) / cols, ny = (r + 0.5) / rows;
        // o lado do texto fica livre de peças: a parede nasce a partir do meio da tela
        const vis = isMobile() ? (ny >= 0.5 ? 1 : 0) : nx >= 0.44 ? 1 : 0;
        const kk = isMobile() ? THREE.MathUtils.smoothstep(ny, 0.45, 0.8) : THREE.MathUtils.smoothstep(nx, 0.4, 0.78);
        front.color.setScalar(0.5 + 0.5 * kk);
        // montagem a partir do centro, onde o símbolo do preloader se abre
        const dc = Math.hypot(c - (cols - 1) / 2, (r - (rows - 1) / 2) * 1.2) / Math.hypot(cols / 2, (rows / 2) * 1.2);
        tiles.push({ mesh, front, x, y, c, r, k: kk, vis, van: 0, rot: 0, hold: 0, intro: dc * 0.95 + hr * 0.2, wob: hr * 6.28 });
      }
    base.dispose();
  };

  const resize = () => {
    const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    pointer = true;
  };
  window.addEventListener("pointermove", onMove);
  const io = new IntersectionObserver(([en]) => void (visible = en.isIntersecting), { threshold: 0 });
  io.observe(el);

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let introT = -99;
  let last = 0;

  const st: CobogoStage = {
    progress: 0,
    intro: () => void (introT = (performance.now() - t0) / 1000),
    destroy: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      });
      texCache.forEach((t) => t.dispose());
      photoTex.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  const update = (t: number) => {
    const dt = Math.min(0.05, t - last);
    last = t;
    const p = st.progress;
    ray.setFromCamera(mouse, camera);
    ray.ray.intersectPlane(plane, hit);
    torch.position.x += (hit.x - torch.position.x) * 0.12;
    torch.position.y += (hit.y - torch.position.y) * 0.12;
    torch.intensity += ((pointer ? 18 : 0) - torch.intensity) * 0.05;
    const ti = t - introT;
    const pf = THREE.MathUtils.clamp(p / 0.42, 0, 1), pv = THREE.MathUtils.clamp((p - 0.42) / 0.28, 0, 1);
    const wave = pf * (cols * 1.6 + rows) - 2;
    const vwave = pv * (cols + rows * 0.6 + 3) - 1.5;
    wallMat.opacity = 1 - THREE.MathUtils.smoothstep(pv, 0, 0.55);
    tiles.forEach((tl) => {
      const d = Math.hypot(tl.x - hit.x, tl.y - hit.y);
      if (pointer && d < 1.5) tl.hold = 1.6;
      tl.hold = Math.max(0, tl.hold - dt);
      const order = tl.c + (rows - tl.r) * 0.6;
      const target = tl.hold > 0 || wave - order > 0 ? Math.PI : 0;
      tl.rot += (target - tl.rot) * 0.08;
      tl.van += ((vwave - order > 0 ? 1 : 0) - tl.van) * 0.09;
      const e0 = THREE.MathUtils.clamp((ti - tl.intro) / 1.1, 0, 1), e = 1 - Math.pow(1 - e0, 4);
      // perto do cursor as peças se inclinam para a luz, como azulejos soltos
      const near = pointer ? Math.max(0, 1 - d / 3.2) : 0;
      tl.mesh.rotation.y = tl.rot + (1 - e) * Math.PI * 0.5 + (hit.x - tl.x) * 0.05 * near;
      tl.mesh.rotation.x = (1 - e) * 0.7 - (hit.y - tl.y) * 0.05 * near + Math.sin(t * 0.6 + tl.wob) * 0.012;
      const sc = (0.5 + 0.5 * e) * tl.vis * (1 - tl.van);
      tl.mesh.visible = sc > 0.004;
      tl.mesh.scale.setScalar(Math.max(sc, 0.0001));
      const u = tl.rot / Math.PI;
      tl.mesh.position.z = Math.sin(tl.rot) * 1.1 + near * 0.18 + (1 - e) * -2.5 - (1 - tl.k) * 0.35 * (1 - u) - tl.van * 1.2;
    });
    grid.rotation.y = mouseS.x * 0.025 * (1 - pf);
    grid.rotation.x = -mouseS.y * 0.02 * (1 - pf);
    camera.position.z = dist * (1 - pf * 0.08);
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    const t = (performance.now() - t0) / 1000;
    mouseS.lerp(mouse, 0.05);
    update(t);
    renderer.render(scene, camera);
  };
  resize();
  loop();
  return st;
}
