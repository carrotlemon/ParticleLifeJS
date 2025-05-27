// Example Usage
// let boundary = new Rectangle(0, 0, 200, 200);
// let qt = new Quadtree(boundary, 4);

// qt.insert(new Point(50, 50));
// qt.insert(new Point(-60, 80));
// qt.insert(new Point(-30, -40));
// qt.insert(new Point(80, -90));
// qt.insert(new Point(90, 90));

// let range = new Rectangle(50, 50, 30, 30);
// let found = qt.query(range);

// console.log("Points in range:", found);

class Point {
    constructor(x, y, colorid = null, color = '#ff0000') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.colorid = colorid;
        this.color = color;
    }
    applyForce(force, theta, deltaTime) {
        this.vx += force*Math.cos(theta)*deltaTime;
        this.vy += force*Math.sin(theta)*deltaTime;
    }
    update(deltaTime=0) {
        this.x += this.vx*deltaTime;
        this.y += this.vy*deltaTime;
    }
    distanceSquared(otherPoint) {
        let dx = this.x - otherPoint.x;
        let dy = this.y - otherPoint.y;
        return dx*dx + dy*dy;
    }
}
class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    contains(point) {
        return (point.x >= this.x &&
                point.x <= this.x + this.w &&
                point.y >= this.y &&
                point.y <= this.y + this.h);
    }

    intersects(range) {
        return !(range.x + range.w < this.x ||
                 range.x > this.x + this.w ||
                 range.y + range.h < this.y ||
                 range.y > this.y + this.h);
    }
}

class Quadtree {
    constructor(boundary, capacity) {
        this.boundary = boundary;
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
    }

    subdivide() {
        let { x, y, w, h } = this.boundary;
        let nw = new Rectangle(x, y, w / 2, h / 2);
        let ne = new Rectangle(x + w / 2, y, w / 2, h / 2);
        let sw = new Rectangle(x, y + h / 2, w / 2, h / 2);
        let se = new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2);

        this.northwest = new Quadtree(nw, this.capacity);
        this.northeast = new Quadtree(ne, this.capacity);
        this.southwest = new Quadtree(sw, this.capacity);
        this.southeast = new Quadtree(se, this.capacity);

        this.divided = true;
    }

    insert(point) {
        if (!this.boundary.contains(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        return (this.northwest.insert(point) ||
            this.northeast.insert(point) ||
            this.southwest.insert(point) ||
            this.southeast.insert(point));
    }

    query(range, found = []) {
        if (!this.boundary.intersects(range)) {
            return found;
        }
    
        let newFound = [...found]; // Create a new array
        for (let p of this.points) {
            if (range.contains(p)) {
                newFound.push(p);
            }
        }
    
        if (this.divided) {
            newFound = this.northwest.query(range, newFound);
            newFound = this.northeast.query(range, newFound);
            newFound = this.southwest.query(range, newFound);
            newFound = this.southeast.query(range, newFound);
        }
    
        return newFound;
    }

    draw(ctx, showBoundaries) {
        // Draw Boundary
        if(showBoundaries) {
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 1;
            ctx.strokeRect(this.boundary.x, this.boundary.y, this.boundary.w, this.boundary.h);
        }
        // Draw Points
        for (const p of this.points) {
            ctx.fillStyle = (p?.color) ? p.color : "white";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }

        // Draw Divided Boundaries
        if(this.divided) {
            this.northwest.draw(ctx, showBoundaries);
            this.northeast.draw(ctx, showBoundaries);
            this.southwest.draw(ctx, showBoundaries);
            this.southeast.draw(ctx, showBoundaries);
        }
    }

    rebuild(allParticles) {
        newQT = new Quadtree(this.boundary, this.capacity);
        for(let p of allParticles) {
            newQT.insert(p);
        }
        return newQT;
    }
}

export { Point, Rectangle, Quadtree };