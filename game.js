// Scene, Camera & Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2634);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Inputs
const nameInput = document.getElementById('playerName');
const classSelect = document.getElementById('playerClass');

// Victory Royale Overlay UI
const victoryScreen = document.createElement('div');
victoryScreen.style.cssText = `
  display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.88);
  color: #ffcc00; font-family: sans-serif; flex-direction: column;
  align-items: center; justify-content: center; z-index: 100; text-align: center; padding: 20px;
`;
document.body.appendChild(victoryScreen);

// Lighting & Ground
const light = new THREE.DirectionalLight(0xffffff, 1.1);
light.position.set(10, 20, 10);
scene.add(light, new THREE.AmbientLight(0x505050));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x2d4c3b })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Shrinking Safe Zone Ring
let zoneRadius = 45;
const zoneGeo = new THREE.RingGeometry(zoneRadius - 0.5, zoneRadius, 64);
const zoneMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide });
const safeZone = new THREE.Mesh(zoneGeo, zoneMat);
safeZone.rotation.x = -Math.PI / 2;
safeZone.position.y = 0.05;
scene.add(safeZone);

// Player Character Group
const player = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2421 });
const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.6), bodyMat);
body.position.y = 0.75;

// Character Head (Where Your Photo Goes)
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), headMaterial);
head.position.y = 2.0;

player.add(body, head);
scene.add(player);

// Change Armor Color Based on Selected Class
function updateClassStyle() {
  const cls = classSelect.value;
  if (cls === 'Rusher') bodyMat.color.setHex(0xd9534f);     // Crimson Tactical Vest
  else if (cls === 'Sniper') bodyMat.color.setHex(0x2b5876); // Stealth Navy Vest
  else bodyMat.color.setHex(0x2e8b57);                       // Airborne Recon Green
}
classSelect.addEventListener('change', updateClassStyle);
updateClassStyle();

// Upload Photo & Map to Character Head
document.getElementById('faceUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];

  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const texture = new THREE.TextureLoader().load(event.target.result);
    head.material = new THREE.MeshStandardMaterial({ map: texture });
  };
  reader.readAsDataURL(file);
});

// Spawn 10 Enemy Targets
const enemies = [];
const totalEnemies = 10;
for (let i = 0; i < totalEnemies; i++) {
  const enemy = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0xd9534f })
  );
  enemy.position.set((Math.random() - 0.5) * 60, 1, (Math.random() - 0.5) * 60);
  scene.add(enemy);
  enemies.push(enemy);
}

// Controls & Shooting
const keys = {};
let score = 0, velocityY = 0, isGrounded = true, gameWon = false;
window.addEventListener('keydown', (e) => {
  if (document.activeElement === nameInput) return; // Allow typing name freely
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

window.addEventListener('click', (e) => {
  if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName) || gameWon) return;

  const bulletSpeed = classSelect.value === 'Sniper' ? 2.4 : 1.2;
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15),
    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
  );
  bullet.position.copy(player.position).add(new THREE.Vector3(0, 1.5, 0));
  bullet.userData.vel = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion).multiplyScalar(bulletSpeed);
  scene.add(bullet);

  const interval = setInterval(() => {
    bullet.position.add(bullet.userData.vel);
    enemies.forEach((enemy, idx) => {
      if (bullet.position.distanceTo(enemy.position) < 1.2) {
        scene.remove(enemy, bullet);
        enemies.splice(idx, 1);
        score += 1;
        clearInterval(interval);

        // Trigger Personalized Victory Royale
        if (enemies.length === 0 && !gameWon) {
          gameWon = true;
          const opName = nameInput.value.trim() || 'UNKNOWN OPERATOR';
          const opClass = classSelect.value.toUpperCase();
          victoryScreen.innerHTML = `
            <div style="border: 2px solid #ff9900; padding: 30px 40px; border-radius: 12px; background: rgba(20, 20, 20, 0.95);">
              <p style="color: #00ff66; letter-spacing: 2px; margin: 0 0 8px; font-weight: bold;">
                MVP: ${opName} // CLASS: ${opClass}
              </p>
              <h1 style="font-size: 3rem; margin: 0; letter-spacing: 3px; text-shadow: 0 0 20px #ff9900;">
                BOOYAH! VICTORY ROYALE
              </h1>
              <p style="color: #fff; font-size: 1.1rem; margin: 14px 0 24px;">
                ALL ${totalEnemies} HOSTILES ELIMINATED — LAST OPERATOR STANDING
              </p>
              <button onclick="location.reload()" style="
                padding: 14px 32px; font-size: 1.1rem; font-weight: bold; background: #ff9900;
                color: #111; border: none; border-radius: 6px; cursor: pointer;
              ">PLAY AGAIN</button>
            </div>
          `;
          victoryScreen.style.display = 'flex';
        }
      }
    });
  }, 16);
  setTimeout(() => { scene.remove(bullet); clearInterval(interval); }, 1500);
});

// Game Loop
function animate() {
  requestAnimationFrame(animate);

  const currentClass = classSelect.value;
  const moveSpeed = currentClass === 'Rusher' ? 0.28 : 0.2;
  const jumpForce = currentClass === 'Airborne' ? 0.38 : 0.25;

  if (!gameWon) {
    if (keys['w']) player.translateZ(-moveSpeed);
    if (keys['s']) player.translateZ(moveSpeed);
    if (keys['a']) player.rotation.y += 0.05;
    if (keys['d']) player.rotation.y -= 0.05;
    if (keys[' '] && isGrounded) { velocityY = jumpForce; isGrounded = false; }

    // Gravity
    player.position.y += velocityY;
    if (player.position.y > 0) velocityY -= 0.015;
    else { player.position.y = 0; velocityY = 0; isGrounded = true; }

    // Shrink Safe Zone
    if (zoneRadius > 8) {
      zoneRadius -= 0.005;
      safeZone.scale.set(zoneRadius / 45, zoneRadius / 45, 1);
    }
  } else {
    player.rotation.y += 0.03;
  }

  // Third-Person Camera Follow
  const camOffset = new THREE.Vector3(0, 4, 7).applyMatrix4(player.matrixWorld);
  camera.position.lerp(camOffset, 0.1);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  const displayName = nameInput.value.trim() || 'OPERATOR';
  document.getElementById('stats').innerText =
    `${displayName} [${currentClass}] | Kills: ${score}/${totalEnemies} | Alive: ${enemies.length + 1}`;

  renderer.render(scene, camera);
}
animate();
