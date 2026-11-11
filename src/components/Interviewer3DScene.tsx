import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import {
  InterviewerState,
  MoodTag,
  GestureTag,
  getAvatarAnimationParams,
} from '../utils/interviewRules';
import { InterviewerPersona } from '../data/seedData';

export interface Interviewer3DSceneProps {
  persona: InterviewerPersona;
  interviewerState: InterviewerState;
  moodTag: MoodTag;
  gestureTag: GestureTag;
  lipSyncVolume: number; // 0.0 to 1.0 driven by Web Audio API AnalyserNode
  customVrmUrl?: string | null;
  customRoomGlbUrl?: string | null;
  cameraPreset?: 'desk' | 'closeup' | 'wide';
  onModelStatusChange?: (status: string) => void;
}

// Pre-allocated scratch math objects outside the render loop (Zero GC)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.25, 0);

function createWoodGrainBumpTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const shade = 115 + Math.floor(Math.sin(y * 0.15) * 18 + (Math.random() - 0.5) * 12);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createFloorGridTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#090e1c';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#16213e';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export const Interviewer3DScene: React.FC<Interviewer3DSceneProps> = ({
  persona,
  interviewerState,
  moodTag,
  gestureTag,
  lipSyncVolume,
  customVrmUrl = '/models/interviewer.vrm',
  customRoomGlbUrl,
  cameraPreset = 'desk',
  onModelStatusChange,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Store latest mutable props in refs so React HUD updates never recreate the WebGL context
  const stateRef = useRef({
    persona,
    interviewerState,
    moodTag,
    gestureTag,
    lipSyncVolume,
    cameraPreset,
  });

  useEffect(() => {
    stateRef.current = {
      persona,
      interviewerState,
      moodTag,
      gestureTag,
      lipSyncVolume,
      cameraPreset,
    };
  }, [persona, interviewerState, moodTag, gestureTag, lipSyncVolume, cameraPreset]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const keyLightRef = useRef<THREE.SpotLight | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection Guard (SwiftShader / llvmpipe / headless Chromium)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const bgHex = 0x070b16;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.085);

    // 2. Studio PBR Environment Reflection via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera & Damped OrbitControls
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    camera.position.set(0, 1.42, 2.35);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.24, 0);
    controls.minDistance = 1.35;
    controls.maxDistance = 4.2;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.update();

    // 4. Studio 3-Point Lighting Rig (Warm Key + Cool Hemisphere Fill + Rim Backlight)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.1);
    keyLight.position.set(2.4, 3.8, 2.6);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      const d = 3.2;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.75);
    fillLight.position.set(-2.5, 2.2, 1.8);
    scene.add(fillLight);

    const rimSpot = new THREE.SpotLight(0x818cf8, 2.4, 10, Math.PI / 4, 0.6, 1.5);
    rimSpot.position.set(0, 2.8, -2.2);
    rimSpot.target.position.set(0, 1.2, 0);
    scene.add(rimSpot);
    scene.add(rimSpot.target);
    keyLightRef.current = rimSpot;

    // 5. Preserved Executive Interview Room (Floor, Grid, Studio Desk, Laptop, Chair)
    const roomGroup = new THREE.Group();
    roomGroupRef.current = roomGroup;
    scene.add(roomGroup);

    const woodBump = createWoodGrainBumpTexture(renderer);
    const floorTex = createFloorGridTexture(renderer);

    // 5a. Studio Floor + Contact Shadow Grounding
    const floorGeo = new THREE.PlaneGeometry(18, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: floorTex,
      roughness: 0.75,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // Soft radial contact shadow under desk and chair (offset Y by 0.015 to prevent Z-fighting)
    const contactShadowGeo = new THREE.CircleGeometry(1.75, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.set(0, 0.015, 0.25);
    roomGroup.add(contactShadowMesh);

    // 5b. Studio Acoustic Back Wall with Soft Ambient Vertical Slat Strips
    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(0, 0, -3.2);

    const wallBase = new THREE.Mesh(
      new THREE.BoxGeometry(16, 8, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0a101f, roughness: 0.88, metalness: 0.05 })
    );
    wallBase.position.set(0, 4, 0);
    backWallGroup.add(wallBase);

    // Vertical acoustic wood slat columns with subtle accent lighting
    const slatMat = new THREE.MeshStandardMaterial({
      color: 0x111c33,
      bumpMap: woodBump,
      bumpScale: 0.02,
      roughness: 0.65,
      metalness: 0.2,
    });
    for (let x = -5.4; x <= 5.4; x += 0.45) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7.2, 0.06), slatMat);
      slat.position.set(x, 3.8, 0.12);
      backWallGroup.add(slat);
    }
    roomGroup.add(backWallGroup);

    // 5c. Executive Minimalist Desk with Matte Walnut Finish & Brushed Aluminum Frame
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, 0.32);

    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.048, 0.82),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        bumpMap: woodBump,
        bumpScale: 0.025,
        roughness: 0.45,
        metalness: 0.25,
      })
    );
    deskTop.position.set(0, 0.74, 0);
    deskTop.castShadow = !isSoftwareGl;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);

    // Modern tapered metal desk frame
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.85 });
    const legGeo = new THREE.BoxGeometry(0.045, 0.74, 0.045);
    const legPositions = [
      [-0.88, 0.37, -0.34],
      [0.88, 0.37, -0.34],
      [-0.88, 0.37, 0.34],
      [0.88, 0.37, 0.34],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = !isSoftwareGl;
      deskGroup.add(leg);
    });

    // Sleek Desk Accessories: Interviewer Laptop, Desk Microphone, Ambient Lightbar
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(-0.35, 0.765, 0.08);
    laptopGroup.rotation.y = 0.22;

    const laptopBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.012, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 })
    );
    const laptopScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.21, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.4 })
    );
    laptopScreen.position.set(0, 0.1, -0.1);
    laptopScreen.rotation.x = -0.22;

    const screenGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.29, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screenGlow.position.set(0, 0.1, -0.094);
    screenGlow.rotation.x = -0.22;

    laptopGroup.add(laptopBase, laptopScreen, screenGlow);
    deskGroup.add(laptopGroup);

    // Interview Broadcast Mic on Desk
    const micGroup = new THREE.Group();
    micGroup.position.set(0.42, 0.765, 0.12);
    const micBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.048, 0.015, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 })
    );
    const micStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
    );
    micStem.position.set(0, 0.09, 0);
    const micCapsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.022, 0.065, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.35 })
    );
    micCapsule.position.set(0.02, 0.24, -0.02);
    micCapsule.rotation.x = 0.35;
    micGroup.add(micBase, micStem, micCapsule);
    deskGroup.add(micGroup);

    roomGroup.add(deskGroup);

    // 5d. High-Back Ergonomic Executive Chair behind desk
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -0.18);
    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.88, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.2 })
    );
    chairBack.position.set(0, 1.15, -0.22);
    chairGroup.add(chairBack);
    roomGroup.add(chairGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer tracking for subtle eye / head gaze alignment
    const pointerNdc = { x: 0, y: 0 };
    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }
    };
    window.addEventListener('mousemove', onPointerMove);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(container);

    // 6. Frame-Rate Independent Animation Loop for VRM Only
    let frameId = 0;
    let unmounted = false;
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (unmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (unmounted) return;
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      const {
        interviewerState: curState,
        moodTag: curMood,
        gestureTag: curGesture,
        lipSyncVolume: curLipVol,
        cameraPreset: curPreset,
      } = stateRef.current;

      const animParams = getAvatarAnimationParams(curState, curMood, curGesture);

      // Smooth Camera Preset Damping
      if (curPreset === 'closeup') {
        _targetCamPos.set(0, 1.48, 1.65);
        _targetLookAt.set(0, 1.42, 0);
      } else if (curPreset === 'wide') {
        _targetCamPos.set(0, 1.56, 3.05);
        _targetLookAt.set(0, 1.18, 0);
      } else {
        _targetCamPos.set(0, 1.42, 2.32);
        _targetLookAt.set(0, 1.26, 0);
      }
      const dampAlpha = 1 - Math.exp(-3.5 * delta);
      _currentLookAt.lerp(_targetLookAt, dampAlpha);
      controls.target.copy(_currentLookAt);
      controls.update();

      // Blink State Machine
      blinkTimer += delta;
      if (!isBlinking && blinkTimer >= animParams.eyeBlinkIntervalSeconds) {
        isBlinking = true;
        blinkTimer = 0;
      } else if (isBlinking && blinkTimer >= 0.14) {
        isBlinking = false;
        blinkTimer = 0;
      }
      const blinkValue = isBlinking ? Math.sin((blinkTimer / 0.14) * Math.PI) : 0;

      // Lip-sync mouth open factor (combines Web Audio Analyser volume + procedural speaking cadence)
      const speakingOsc =
        curState === 'Speaking'
          ? 0.25 + 0.35 * Math.abs(Math.sin(elapsed * 11.5)) * Math.abs(Math.cos(elapsed * 6.2))
          : 0.04;
      const mouthOpen = Math.min(1, Math.max(curLipVol * 1.4, speakingOsc));

      // Update VRM Avatar exclusively
      const vrm = vrmRef.current;
      if (vrm) {
        vrm.update(delta);

        // Expressions (Lip-sync, Blink, Mood)
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue('blink', blinkValue);
          vrm.expressionManager.setValue('aa', mouthOpen * 0.85);
          vrm.expressionManager.setValue('ou', mouthOpen * 0.3);
          vrm.expressionManager.setValue('happy', animParams.smileWeight * 0.6);
        }

        // Head Gaze & Nodding Kinematics
        const headNode = vrm.humanoid?.getNormalizedBoneNode('head');
        if (headNode) {
          const targetPitch =
            Math.sin(elapsed * animParams.nodFrequency * Math.PI * 2) * animParams.nodAmplitude +
            pointerNdc.y * 0.06;
          const targetYaw = pointerNdc.x * 0.12;
          headNode.rotation.x = THREE.MathUtils.damp(headNode.rotation.x, targetPitch, 6, delta);
          headNode.rotation.y = THREE.MathUtils.damp(headNode.rotation.y, targetYaw, 6, delta);
          headNode.rotation.z = THREE.MathUtils.damp(
            headNode.rotation.z,
            animParams.headTiltRadians,
            5,
            delta
          );
        }

        // Natural subtle breathing motion on spine / chest
        const spineNode = vrm.humanoid?.getNormalizedBoneNode('spine');
        if (spineNode) {
          const breath = Math.sin(elapsed * animParams.breathingRate * 2) * 0.015;
          spineNode.rotation.x = THREE.MathUtils.damp(spineNode.rotation.x, breath, 4, delta);
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Load User's VRM Avatar Exclusively
  useEffect(() => {
    const vrmUrl = customVrmUrl || '/models/interviewer.vrm';
    const scene = sceneRef.current;
    if (!scene) return;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    onModelStatusChange?.('Loading interviewer.vrm into Executive Room...');

    loader.load(
      vrmUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          onModelStatusChange?.('Could not parse VRM model');
          return;
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.rotateVRM0(vrm);
        vrm.scene.rotation.y = 0;

        // Natural interviewer seated pose behind the executive desk
        try {
          const leftArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
          const rightArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
          const leftElbow = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
          const rightElbow = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
          if (leftArm) leftArm.rotation.z = -1.15;
          if (rightArm) rightArm.rotation.z = 1.15;
          if (leftElbow) leftElbow.rotation.y = -0.25;
          if (rightElbow) rightElbow.rotation.y = 0.25;
        } catch {
          /* best effort */
        }

        // Remove old VRM if present
        if (vrmRef.current) {
          scene.remove(vrmRef.current.scene);
        }

        // Place VRM seated in the executive chair behind the desk
        vrm.scene.position.set(0, 0, -0.12);
        scene.add(vrm.scene);
        vrmRef.current = vrm;
        onModelStatusChange?.('Waguri VRM Model Active in Executive Room');
      },
      undefined,
      (err) => {
        console.warn('VRM load error from', vrmUrl, err);
        // Fallback to /interviewer.vrm if /models/interviewer.vrm had an issue
        if (vrmUrl !== '/interviewer.vrm') {
          loader.load(
            '/interviewer.vrm',
            (gltf) => {
              const vrm = gltf.userData.vrm as VRM | undefined;
              if (vrm) {
                VRMUtils.removeUnnecessaryVertices(gltf.scene);
                VRMUtils.combineSkeletons(gltf.scene);
                VRMUtils.rotateVRM0(vrm);
                vrm.scene.position.set(0, 0, -0.12);
                scene.add(vrm.scene);
                vrmRef.current = vrm;
                onModelStatusChange?.('Waguri VRM Model Active in Executive Room');
              }
            },
            undefined,
            () => {
              onModelStatusChange?.('Upload your .vrm model anytime using the VRM uploader');
            }
          );
        }
      }
    );
  }, [customVrmUrl, onModelStatusChange]);

  // Load Custom Room GLB if user uploads an additional room asset
  useEffect(() => {
    if (!customRoomGlbUrl || !roomGroupRef.current) return;
    const loader = new GLTFLoader();
    loader.load(
      customRoomGlbUrl,
      (gltf) => {
        if (!roomGroupRef.current) return;
        roomGroupRef.current.add(gltf.scene);
        onModelStatusChange?.('Custom Interview Room GLB Combined');
      },
      undefined,
      () => {
        onModelStatusChange?.('Room GLB load failed — Studio Room Active');
      }
    );
  }, [customRoomGlbUrl, onModelStatusChange]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="interviewer-3d-canvas"
      className="w-full h-full relative overflow-hidden bg-[#070b16]"
      aria-label="3D AI Interviewer Viewport"
    />
  );
};
