'use strict';

// Основной функционал
class Vector {
    constructor (x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    plus (obj) {
        
        if (!(obj instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector.');
        }
        
        return new Vector (this.x + obj.x, this.y + obj.y);
    }
    
    times (multiplier) {
        return new Vector(this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor (objPos = new Vector(0, 0), objSize = new Vector(1, 1), objSpeed = new Vector(0, 0)) {
        
        if (!(objPos instanceof Vector) || !(objSize instanceof Vector) || !(objSpeed instanceof Vector)) {
            throw new Error('Передан объект не типа Vector.');
        }
        
        this.pos = objPos;
        this.size = objSize;
        this.speed = objSpeed;
    }

    get left() {
        return this.pos.x;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    get top() {
        return this.pos.y;
    }

    get type() {
        return 'actor';
    }
    
    act() {}
    
    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Аргумент не передан или не является типом Actor');
        }
        
        if(actor === this) {
            return false;
        }
        
        if (this.left >= actor.right || this.right <= actor.left || this.bottom <= actor.top || this.top >= actor.bottom) {
           return false;
        } 
        
        return true; 
    }
}

class Level {
    constructor(grid = [], actors = []) {
        
        this.grid = grid;
        this.actors = actors;
        this.player = this.actors.find(actor => actor.type === 'player');
                       
        this.height = this.grid.length;
        this.width = this.grid.reduce((memo, destArr) => {
            if (destArr.length > memo) memo = destArr.length;
                return memo;
            }, 0);

        this.status = null;
        this.finishDelay = 1;
    }
    
    isFinished() {
        return (this.status !== null && this.finishDelay < 0);
    }

    actorAt(actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error('Объект не передан или не типа Actor');
        }

        return this.actors.find(el => actor.isIntersect(el));
    }

    obstacleAt(position, size) {
        if(!(position instanceof Vector) || !(size instanceof Vector)) {
            throw new Error('Переданы объекты не типа Vector');
        }

        const top = Math.floor(position.y);
        const bottom = Math.ceil(position.y + size.y);
        const left = Math.floor(position.x);
        const right = Math.ceil(position.x + size.x);

        if (top < 0 || left < 0 || right > this.width) {
            return 'wall';    
        } 
        
        if (bottom > this.height) {
            return 'lava';    
        } 
        
        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                if (this.grid[y][x] != null) {
                    return this.grid[y][x];
                }
            }
        }        
    }

    removeActor(actor) {
        const index = this.actors.findIndex(el => el === actor);
        
        if (index != -1) {
            this.actors.splice(index, 1);
        }        
    }

    noMoreActors(type) {
        return !(this.actors.some(actor => actor.type === type));
    }

    playerTouched(type, actor) {
        if (this.status !== null) {
            return;
        }

        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
            return;
        }

        if (type === 'coin' &&  actor.type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';                
            }                             
        }
    }   
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        pos = pos.plus(new Vector(0, -0.5));
        
        let size = new Vector(0.8, 1.5);
        let speed = new Vector(0, 0);

        super(pos, size, speed);
    }

    get type() {
        return 'player';
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        let size = new Vector(0.6, 0.6);
        pos = pos.plus(new Vector(0.2, 0.1));
        super(pos, size);

        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = rand(0, 2 * Math.PI);
        //Костыль для передачи начальной позиции в метод 
        //getNextPosition
        this.start = pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        const x = 0;
        const y = Math.sin(this.spring ) * this.springDist;
        return new Vector(x, y);
    } 

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.start.plus(this.getSpringVector());
    }   

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        let size = new Vector(1, 1);
        super(pos, size, speed);        
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        let next = this.getNextPosition(time);

        if (level.obstacleAt(next, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = next;
        }        
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        let speed = new Vector(2, 0);
        super(pos, speed);
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        let speed = new Vector(0, 2);
        super(pos, speed);
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        let speed = new Vector(0, 3);
        super(pos, speed);
        //Костыль для передачи начальной позиции в метод 
        //handleObstacle
        this.start = pos;
    }

    handleObstacle() {
        this.pos = this.start;
    }    
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = dictionary;
    }

    actorFromSymbol(symbol) {
        return this.dictionary[symbol];        
    }

    obstacleFromSymbol(symbol) {
        if (symbol === 'x') return 'wall';
        
        if (symbol === '!') return 'lava';
    }

    createGrid(arrStrings = []) {
        return arrStrings
            .map(string => string.split(''))
            .map((row) => row.map(cell => this.obstacleFromSymbol(cell)));
    }

    createActors(arrStrings = []) {
        const arrActors = [];
        const parsedSchema = arrStrings.map(string => string.split(''));
        
        for (let row = 0; row < parsedSchema.length; row++) {
            for (let cell = 0; cell < parsedSchema[row].length; cell++) {
                let content = parsedSchema[row][cell];
                let Constructor = this.actorFromSymbol(content);
                
                if (typeof Constructor === 'function') {
                    const actorPos = new Vector(cell, row);
                    const newActor = new Constructor(actorPos);

                    if (newActor instanceof Actor) {
                        arrActors.push(newActor);
                    }                                         
                }
            }
        }        
        return arrActors;
    }
    
    parse(arrStrings) {
        return new Level(this.createGrid(arrStrings), this.createActors(arrStrings));
    }
}

//Вспомогательный код
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}


//Попытка запуска игры

const schema = [
    "     v                 ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "  |xxx       w         ",
    "  o                 o  ",
    "  x               = x  ",
    "  x          o o    x  ",
    "  x  @    *  xxxxx  x  ",
    "  xxxxx             x  ",
    "      x!!!!!!!!!!!!!x  ",
    "      xxxxxxxxxxxxxxx  ",
    "                       "
  ];


const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'v': FireRain,
  '|': VerticalFireball,
  'o': Coin
}
const parser = new LevelParser(actorDict);
const level = parser.parse(schema);
runLevel(level, DOMDisplay)
  .then(status => console.log(`Игрок ${status}`));
