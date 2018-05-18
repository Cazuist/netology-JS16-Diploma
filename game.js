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
        
        return this.left < actor.right && this.right > actor.left && this.bottom > actor.top && this.top < actor.bottom
    }
}

class Level {
    constructor(grid = [], actors = []) {
        
        this.grid = grid;
        this.actors = actors;
        this.player = this.actors.find(actor => actor.type === 'player');
                       
        this.height = this.grid.length;
        this.width = this.grid.reduce((memo, destArr) => {
            return (destArr.length > memo) ? destArr.length: memo;
        }, 0);

        this.status = null;
        this.finishDelay = 1;
    }
    
    isFinished() {
        return this.status !== null && this.finishDelay < 0;
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
                const currCell = this.grid[y][x]
                if (currCell) {
                    return currCell;
                }
            }
        }        
    }

    removeActor(actor) {       
        const index = this.actors.indexOf(actor);

        if (index != -1) {
            this.actors.splice(index, 1);
        }        
    }

    noMoreActors(type) {
        return !this.actors.some(actor => actor.type === type);
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
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));        
    }

    get type() {
        return 'player';
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));

        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * Math.PI * 2;        
        this.start = this.pos;
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
        super(pos, new Vector(1, 1), speed);        
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
        const next = this.getNextPosition(time);

        if (level.obstacleAt(next, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = next;
        }        
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 3));
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
        if (symbol === 'x') {
            return 'wall';
        }
        
        if (symbol === '!') {
            return 'lava';
        }
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
                const content = parsedSchema[row][cell];
                const Constructor = this.actorFromSymbol(content);
                
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

//Запуск игры
const schemas = [
  [
    '         ',
    '         ',
    '    =    ',
    '       o ',
    '     !xxx',
    ' @       ',
    'xxx!     ',
    '         '
  ],
  [
    '      v  ',
    '         ',
    '  v      ',
    '        o',
    '        x',
    '@   x    ',
    'x        ',
    '         '
  ]
];

const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'v': FireRain,
  '|': VerticalFireball,
  'o': Coin
}

const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => alert('Вы выиграли приз!'));