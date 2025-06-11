import { useRef, useEffect, useState } from "react";
import { Point, Rectangle, Quadtree } from './Quadtree.jsx';

const Particles = ({ data }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const particlesRef = useRef([]);
    const qtRef = useRef(null);

    // SIMULATION SETTINGS
    const [gridToggle, setGridToggle] = useState(false); // toggle quadtree grid
    const [numParticles, setNumParticles] = useState(200); // number of particles per color
    
    const [colorCount, setColorCount] = useState(5);
    const [colorOffset, setColorOffset] = useState(0);
    
    const [circleSpawn, setCircleSpawn] = useState(false);
    const [spawnRadius, setSpawnRadius] = useState(300);

    const [matrixScalar, setMatrixScalar] = useState(10);
    const [matrixSelfSetValue, setMatrixSelfSetValue] = useState(false);
    const [matrixSelfSetValueValue, setMatrixSelfSetValueValue] = useState(-1);

    const [minRadius, setMinRadius] = useState(50);
    const [minForce, setMinForce] = useState(1);
    const [maxRadius, setMaxRadius] = useState(150);

    const [particleMass, setParticleMass] = useState(10);
    const [forceScalar, setForceScalar] = useState(200);

    const [wallBehavior, setWallBehavior] = useState(0); // 0 - Wrap, 1 - Bounce
    
    // gravity
    const [gravityToggle, setGravityToggle] = useState(false);
    const [gravity, setGravity] = useState(100);
    // source location of gravity
    const [gravityX, setGravityX] = useState(50); // canvas.width / 2
    const [gravityY, setGravityY] = useState(50); // canvas.height / 2

    // orbit
    const [orbit, setOrbit] = useState(false);
    const [orbitSpeed, setOrbitSpeed] = useState(1*Math.sqrt(Math.sqrt(100))/10);

    let matrix = Array.from({ length: colorCount }, () => Array(colorCount).fill(0));

    useEffect(() => {
        const canvas = canvasRef.current;
        // Set canvas size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        // Create Particles ================================================

        // Initialize force matrix
        
        for (let r = 0; r < colorCount; ++r) {
            for (let c = 0; c < colorCount; ++c) {
                if(matrixSelfSetValue && r == c) {
                matrix[r][c] = matrixSelfSetValueValue;
                } else {
                matrix[r][c] = matrixScalar*2 * Math.random() - matrixScalar; // -1 to 1 force scalar
                }
            }
        }

        // Initialize particles  ================================================
        for (let color = 0; color < colorCount; ++color) {
        const rgbColor = hsvToRgb(color / (colorCount+colorOffset), 1.0, 1.0);
            for (let i = 0; i < numParticles; ++i) {
                // Set location to random spot in a circle
                let newPoint;
                if(circleSpawn) {
                const theta = 2 * Math.PI * Math.random();
                const r = spawnRadius * Math.random();
                newPoint = new Point(canvas.width / 2 + r * Math.cos(theta),
                    canvas.height / 2 + r * Math.sin(theta), color, rgbColor);
                } else {
                newPoint = new Point(canvas.width*Math.random(), canvas.height*Math.random(), color, rgbColor);
                }
                
                particlesRef.current.push(newPoint);
            }
        }
    }, [numParticles, colorCount, circleSpawn, spawnRadius, matrixSelfSetValue, matrixSelfSetValueValue]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        // Set canvas size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        if(animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        // Initialize quadtree ================================================
        rebuildQuadtree(canvas);

        const animate = (currentTime) => {
            const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
            lastTimeRef.current = currentTime;

            // Update Particles  ================================================
            for (let p of particlesRef.current) {
                // Apply forces from nearby particles
                let inRange = qtRef.current.query(
                new Rectangle(p.x - maxRadius, p.y - maxRadius, maxRadius * 2, maxRadius * 2)
                );

                for (let other of inRange) {
                if (p === other) continue; // Skip self

                let dx = p.x - other.x;
                let dy = p.y - other.y;
                let distanceSquared = dx * dx + dy * dy;
                if (distanceSquared < maxRadius * maxRadius) {
                    let force = minForce;
                    let theta = Math.atan2(dy, dx);
                    if (distanceSquared > minRadius * minRadius) {
                    force = forceScalar * matrix[p.colorid][other.colorid] * particleMass / distanceSquared;
                    }
                    p.applyForce(force, theta, deltaTime);
                }

                }

                // Apply Gravity
                if(gravityToggle) {
                p.applyForce(gravity, Math.atan2(gravityY - p.y, gravityX - p.x), deltaTime);
                }

                // Apply Orbit
                if (orbit) {
                let angle = Math.atan2(gravityY - p.y, gravityX - p.x) + Math.PI / 2;
                p.vx += orbitSpeed * Math.cos(angle);
                p.vy += orbitSpeed * Math.sin(angle);
                }

                // Apply velocity damping
                p.vx *= 0.99;
                p.vy *= 0.99;

                // Update position
                p.update(deltaTime);

                // Boundary behavior - wrap around edges OR bounce off edges
                if(!wallBehavior) { // Wrap
                    if (p.x < 0) p.x = canvas.width;
                    if (p.x > canvas.width) p.x = 0;
                    if (p.y < 0) p.y = canvas.height;
                    if (p.y > canvas.height) p.y = 0;
                } else { // Bounce
                    if(p.x < 0) { p.x = 0; p.vx *= -1; }
                    if(p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
                    if(p.y < 0) { p.y = 0; p.vy *= -1; }
                    if(p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }
                }
            }
            // Update Quadtree
            rebuildQuadtree(canvas);
            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            qtRef.current.draw(ctx, gridToggle);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => { 
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [gridToggle, numParticles, colorCount, colorOffset, circleSpawn, spawnRadius, 
        matrixScalar, matrixSelfSetValue, matrixSelfSetValueValue, 
        minRadius, minForce, maxRadius, particleMass, forceScalar, 
        wallBehavior, gravityToggle, gravity, gravityX, gravityY, orbit, orbitSpeed]);

    // Rebuilds quadtree with current particles
    const rebuildQuadtree = (canvas) => {
        qtRef.current = new Quadtree(new Rectangle(0, 0, canvas.width, canvas.height), 5);
        for (let p of particlesRef.current) {
            qtRef.current.insert(p);
        }
    };

    return <div className="flex justify-center">
        <canvas ref={canvasRef} className="w-[80vw] h-[100vh] border" />
        <div className="text-white">
            <p>Grid Toggle</p>
            <input type="checkbox"
                className="bg-white m-2 text-black"
                value={gridToggle}
                onChange={(e) => setGridToggle(e.target.checked)}
            />
            <p>Number of Particles Per Color</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={numParticles}
                onChange={(e) => setNumParticles(Number(e.target.value))}
            />
            <p>Number of Colors</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={colorCount}
                onChange={(e) => setColorCount(Number(e.target.value))}
            />
            <p>Color Offset</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={colorOffset}
                onChange={(e) => setColorOffset(Number(e.target.value))}
            />
            <p>Circle Spawn</p>
            <input type="checkbox"
                className="bg-white m-2 text-black"
                value={circleSpawn}
                onChange={(e) => setCircleSpawn(e.target.checked)}
            />
            <p>Circle Spawn Radius</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={spawnRadius}
                onChange={(e) => setSpawnRadius(Number(e.target.value))}
            />
            <p>Matrix Scalar</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={matrixScalar}
                onChange={(e) => setMatrixScalar(Number(e.target.value))}
            />
            <p>Toggle Manual Matrix value for same color</p>
            <input type="checkbox"
                className="bg-white m-2 text-black"
                value={matrixSelfSetValue}
                onChange={(e) => setMatrixSelfSetValue(e.target.checked)}
            />
            <p>Manual same color value</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={matrixSelfSetValueValue}
                onChange={(e) => setMatrixSelfSetValueValue(Number(e.target.value))}
            />
            <p>Minimum Force Radius</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={minRadius}
                onChange={(e) => setMinRadius(Number(e.target.value))}
            />
            <p>Maximum Force Radius</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={maxRadius}
                onChange={(e) => setMaxRadius(Number(e.target.value))}
            />
            <p>Minimum Force value</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={minForce}
                onChange={(e) => setMinForce(Number(e.target.value))}
            />
            <p>Particle Mass</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={particleMass}
                onChange={(e) => setParticleMass(Number(e.target.value))}
            />
            <p>Force Scalar</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={forceScalar}
                onChange={(e) => setForceScalar(Number(e.target.value))}
            />
            <p>Wall Behavior (0 - Wrap, 1 - Bounce)</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={wallBehavior}
                onChange={(e) => setWallBehavior(Number(e.target.value))}
            />
            <p>Toggle Gravity</p>
            <input type="checkbox"
                className="bg-white m-2 text-black"
                value={gravityToggle}
                onChange={(e) => setGravityToggle(e.target.checked)}
            />
            <p>Gravity Value</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
            />
            <p>Gravity Source X</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={gravityX}
                onChange={(e) => setGravityX(Number(e.target.value))}
            />
            <p>Gravity Source Y</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={gravityY}
                onChange={(e) => setGravityY(Number(e.target.value))}
            />
            <p>Toggle Orbit</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={orbit}
                onChange={(e) => setOrbit(e.target.value)}
            />
            <p>Orbit Value</p>
            <input type="number"
                className="bg-white m-2 text-black"
                value={orbitSpeed}
                onChange={(e) => setOrbitSpeed(Number(e.target.value))}
            />
        </div>    
    </div>
};

function hsvToRgb(h, s, v) {
  let r, g, b;
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export default Particles;