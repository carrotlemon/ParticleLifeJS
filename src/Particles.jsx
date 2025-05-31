// TODO:
// complete form for all constants
// add sliders + custom inputs for some constants

import { useRef, useEffect, useState } from "react";
import { Point, Rectangle, Quadtree } from './Quadtree.jsx';

const Particles = ({ data }) => {
    const canvasRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const particlesRef = useRef([]);
    const qtRef = useRef(null);

    // SIMULATION SETTINGS
    const [numParticles, setNumParticles] = useState(200);

    const WALL_BEHAVIOR = 0; // 0 - Wrap 1 - Bounce
    
    const GRAVITY_TOGGLE = false;
    const GRAVITY = 100;
    const GRAVITY_X = 50; // canvas.width / 2;
    const GRAVITY_Y = 50; // canvas.height / 2;

    const ORBIT = false;
    const ORBIT_SPEED = 1*Math.sqrt(Math.sqrt(GRAVITY))/10;

    const CIRCLE_SPAWN = false;
    const SPAWN_RADIUS = 300;

    //const PARTICLE_COUNT = 200; // per color
    const COLOR_OFFSET = 0;
    const COLOR_COUNT = 5;
    const MATRIX_SCALAR = 10;
    const MATRIX_SELF_SET_VALUE = false;
    const MATRIX_SELF_SET_VALUE_VALUE = -1;

    const MIN_RADIUS = 50;
    const MIN_FORCE = 1;
    const MAX_RADIUS = 150;

    const PARTICLE_MASS = 10;
    const FORCE_SCALAR = 200; // Increased for better visibility

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        // Set canvas size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        // Create Particles ================================================

        // Initialize force matrix
        let matrix = Array.from({ length: COLOR_COUNT }, () => Array(COLOR_COUNT).fill(0));
        for (let r = 0; r < COLOR_COUNT; ++r) {
        for (let c = 0; c < COLOR_COUNT; ++c) {
            if(MATRIX_SELF_SET_VALUE && r == c) {
            matrix[r][c] = MATRIX_SELF_SET_VALUE_VALUE;
            } else {
            matrix[r][c] = MATRIX_SCALAR*2 * Math.random() - MATRIX_SCALAR; // -1 to 1 force scalar
            }
        }
        }

        // Initialize particles  ================================================
        particlesRef.current = [];
        for (let color = 0; color < COLOR_COUNT; ++color) {
        const rgbColor = hsvToRgb(color / (COLOR_COUNT+COLOR_OFFSET), 1.0, 1.0);
        for (let i = 0; i < numParticles; ++i) {
            // Set location to random spot in a circle
            let newPoint;
            if(CIRCLE_SPAWN) {
            const theta = 2 * Math.PI * Math.random();
            const r = SPAWN_RADIUS * Math.random();
            newPoint = new Point(canvas.width / 2 + r * Math.cos(theta),
                canvas.height / 2 + r * Math.sin(theta), color, rgbColor);
            } else {
            newPoint = new Point(canvas.width*Math.random(), canvas.height*Math.random(), color, rgbColor);
            }
            
            particlesRef.current.push(newPoint);
        }
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
                new Rectangle(p.x - MAX_RADIUS, p.y - MAX_RADIUS, MAX_RADIUS * 2, MAX_RADIUS * 2)
                );

                for (let other of inRange) {
                if (p === other) continue; // Skip self

                let dx = p.x - other.x;
                let dy = p.y - other.y;
                let distanceSquared = dx * dx + dy * dy;
                if (distanceSquared < MAX_RADIUS * MAX_RADIUS) {
                    let force = MIN_FORCE;
                    let theta = Math.atan2(dy, dx);
                    if (distanceSquared > MIN_RADIUS * MIN_RADIUS) {
                    force = FORCE_SCALAR * matrix[p.colorid][other.colorid] * PARTICLE_MASS / distanceSquared;
                    }
                    p.applyForce(force, theta, deltaTime);
                }

                }

                // Apply Gravity
                if(GRAVITY_TOGGLE) {
                p.applyForce(GRAVITY, Math.atan2(GRAVITY_Y - p.y, GRAVITY_X - p.x), deltaTime);
                }

                // Apply Orbit
                if (ORBIT) {
                let angle = Math.atan2(GRAVITY_Y - p.y, GRAVITY_X - p.x) + Math.PI / 2;
                p.vx += ORBIT_SPEED * Math.cos(angle);
                p.vy += ORBIT_SPEED * Math.sin(angle);
                }

                // Apply velocity damping
                p.vx *= 0.99;
                p.vy *= 0.99;

                // Update position
                p.update(deltaTime);

                // Boundary behavior - wrap around edges OR bounce off edges
                if(!WALL_BEHAVIOR) { // Wrap
                    if (p.x < 0) p.x = canvas.width;
                    if (p.x > canvas.width) p.x = 0;
                    if (p.y < 0) p.y = canvas.height;
                    if (p.y > canvas.height) p.y = 0;
                } else { // Bounce
                    if(p.x < 0) { p.x = 0; p.vx *= -1; }
                    if(p.x > canvas.height) { p.x = canvas.height; p.vx *= -1}
                    if(p.y < 0) { p.y = 0; p.vy *= -1; }
                    if(p.y > canvas.height) { p.y = canvas.height; p.vy *= -1}
                }
            }
            // Update Quadtree
            rebuildQuadtree(canvas);
            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            qtRef.current.draw(ctx, true);
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);

        return () => { };
    }, [numParticles]);

    // Rebuilds quadtree with current particles
    const rebuildQuadtree = (canvas) => {
        qtRef.current = new Quadtree(new Rectangle(0, 0, canvas.width, canvas.height), 5);
        for (let p of particlesRef.current) {
            qtRef.current.insert(p);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault()
        if(!value.trim()) return
    }

    return <div className="flex justify-center">
        <canvas ref={canvasRef} className="w-[80vw] h-[100vh] border" />
        <div className="text-white">
            <form onSubmit={handleSubmit}>
                <p>Number of Particles Per Color</p>
                <input type="number"
                    className="bg-white m-2 text-black"
                    value={numParticles}
                    onChange={(e) => setNumParticles(e.target.value)}
                />
                <button type="submit" className="hover:underline bg-green-700 rounded-sm p-2 m-2">Update</button>
            </form>
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