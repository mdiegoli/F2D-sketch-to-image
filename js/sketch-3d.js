// 2D Sketch Canvas Setup
const sketchCanvas = document.getElementById('sketchCanvas');
const sketchCtx = sketchCanvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');

// Resize canvas to fit container
function resizeSketchCanvas() {
    const panel = document.getElementById('sketchPanel');
    const height = panel.clientHeight - 120;
    sketchCanvas.width = panel.clientWidth - 40;
    sketchCanvas.height = height;
}

resizeSketchCanvas();
window.addEventListener('resize', resizeSketchCanvas);

// 2D Drawing State
let paths = [];
let currentPath = [];
let isDrawing = false;

// Draw functions
function drawPoint(x, y, color = 'black', size = 3) {
    sketchCtx.fillStyle = color;
    sketchCtx.beginPath();
    sketchCtx.arc(x, y, size, 0, Math.PI * 2);
    sketchCtx.fill();
}

function drawLine(x1, y1, x2, y2, color = 'black', width = 2) {
    sketchCtx.strokeStyle = color;
    sketchCtx.lineWidth = width;
    sketchCtx.beginPath();
    sketchCtx.moveTo(x1, y1);
    sketchCtx.lineTo(x2, y2);
    sketchCtx.stroke();
}

function redrawSketch() {
    sketchCtx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    sketchCtx.strokeStyle = 'black';
    sketchCtx.lineWidth = 2;
    
    // Draw all paths
    paths.forEach(path => {
        if (path.length > 0) {
            sketchCtx.beginPath();
            sketchCtx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                sketchCtx.lineTo(path[i].x, path[i].y);
            }
            sketchCtx.stroke();
            
            // Draw points
            path.forEach(point => {
                drawPoint(point.x, point.y, 'red', 4);
            });
        }
    });
    
    // Draw current path
    if (currentPath.length > 0) {
        sketchCtx.beginPath();
        sketchCtx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
            sketchCtx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        sketchCtx.stroke();
        
        currentPath.forEach(point => {
            drawPoint(point.x, point.y, 'blue', 4);
        });
    }
}

// Mouse events
sketchCanvas.addEventListener('mousedown', (e) => {
    const rect = sketchCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.shiftKey) {
        // Delete mode
        for (let i = 0; i < currentPath.length; i++) {
            const dist = Math.sqrt((currentPath[i].x - x) ** 2 + (currentPath[i].y - y) ** 2);
            if (dist < 10) {
                currentPath.splice(i, 1);
                redrawSketch();
                return;
            }
        }
        for (let p = 0; p < paths.length; p++) {
            for (let i = 0; i < paths[p].length; i++) {
                const dist = Math.sqrt((paths[p][i].x - x) ** 2 + (paths[p][i].y - y) ** 2);
                if (dist < 10) {
                    paths[p].splice(i, 1);
                    redrawSketch();
                    return;
                }
            }
        }
    } else {
        isDrawing = true;
        currentPath = [{ x, y }];
    }
});

sketchCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    
    const rect = sketchCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    currentPath.push({ x, y });
    redrawSketch();
});

sketchCanvas.addEventListener('mouseup', () => {
    if (isDrawing && currentPath.length > 1) {
        paths.push([...currentPath]);
        currentPath = [];
        isDrawing = false;
        redrawSketch();
    }
});

// Button events
clearBtn.addEventListener('click', () => {
    paths = [];
    currentPath = [];
    redrawSketch();
    if (mesh3d) {
        scene.remove(mesh3d);
        mesh3d = null;
    }
});

undoBtn.addEventListener('click', () => {
    if (paths.length > 0) {
        paths.pop();
        redrawSketch();
    } else if (currentPath.length > 0) {
        currentPath = [];
        redrawSketch();
    }
});

// ===== THREE.JS 3D SETUP =====

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const renderPanel = document.getElementById('renderPanel');
const width = renderPanel.clientWidth;
const height = renderPanel.clientHeight;

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.set(0, 50, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderPanel.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// 3D Mesh variable
let mesh3d = null;
let autoRotate = true;

// Convert 2D path to 3D geometry
function create3DGeometry(paths2D) {
    if (paths2D.length === 0) return null;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    let vertexIndex = 0;
    
    const extrusionHeight = 50;
    
    paths2D.forEach(path => {
        if (path.length < 2) return;
        
        // Normalize path coordinates
        const normalizedPath = path.map(p => ({
            x: (p.x / sketchCanvas.width - 0.5) * 100,
            y: (p.y / sketchCanvas.height - 0.5) * 100
        }));
        
        // Bottom vertices (z = -extrusionHeight/2)
        normalizedPath.forEach(p => {
            vertices.push(p.x, p.y, -extrusionHeight / 2);
        });
        
        // Top vertices (z = extrusionHeight/2)
        normalizedPath.forEach(p => {
            vertices.push(p.x, p.y, extrusionHeight / 2);
        });
        
        const pathLength = normalizedPath.length;
        const bottomStart = vertexIndex;
        const topStart = vertexIndex + pathLength;
        
        // Side faces
        for (let i = 0; i < pathLength - 1; i++) {
            const b1 = bottomStart + i;
            const b2 = bottomStart + i + 1;
            const t1 = topStart + i;
            const t2 = topStart + i + 1;
            
            // Two triangles per side
            indices.push(b1, t1, t2);
            indices.push(b1, t2, b2);
        }
        
        vertexIndex += pathLength * 2;
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();
    
    return geometry;
}

// Generate 3D
generateBtn.addEventListener('click', () => {
    if (paths.length === 0 && currentPath.length === 0) {
        alert('Please draw a path first!');
        return;
    }
    
    // Remove old mesh
    if (mesh3d) scene.remove(mesh3d);
    
    // Create new geometry
    const allPaths = [...paths, ...(currentPath.length > 0 ? [currentPath] : [])];
    const geometry = create3DGeometry(allPaths);
    
    if (!geometry) {
        alert('Could not create geometry. Please draw a valid path.');
        return;
    }
    
    const material = new THREE.MeshPhongMaterial({
        color: 0x00aa44,
        shininess: 100,
        wireframe: false
    });
    
    mesh3d = new THREE.Mesh(geometry, material);
    mesh3d.castShadow = true;
    mesh3d.receiveShadow = true;
    scene.add(mesh3d);
});

// Handle window resize
window.addEventListener('resize', () => {
    const newWidth = renderPanel.clientWidth;
    const newHeight = renderPanel.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (mesh3d && autoRotate) {
        mesh3d.rotation.x += 0.003;
        mesh3d.rotation.y += 0.005;
    }
    
    renderer.render(scene, camera);
}

animate();

redrawSketch();