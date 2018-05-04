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
    constructor (objPos = new Vector(), objSize = new Vector(1, 1), objSpeed = new Vector()) {
        
        if (!(objPos instanceof Vector) || !(objSize instanceof Vector) || !(objSpeed instanceof Vector)) {
            throw new Error('Передан объект не типа Vector.');
        }
        
        this.pos = objPos;
        this.size = objSize;
        this.speed = objSpeed;
        
        Object.defineProperties(this, {
            left: {
                get: () => this.pos.x
            },
            
            right: {
                get: () => this.pos.x + this.size.x
            },
            
            bottom: {
                get: () => this.pos.y + this.size.y
            },
            
            top: {
                get: () => this.pos.y
            },
            
            type: {
                get: () => {
                    if (this.constructor.name.toLowerCase().indexOf('fire') !== -1) return 'fireball';
                    else return this.constructor.name.toLowerCase();
                }
            },
        });
    }
    
    act() {}
    
    isIntersect(actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error('Аргумент не передан или не является типом Actor');
        } 

        if (this == actor) return false;
        
        else if (this.left >= actor.right || this.right <= actor.left || this.bottom <= actor.top || this.top >= actor.bottom) return false;
        
    return true;   
    }
}

class Level {
    constructor(grid = [], actors = []) {
        
        this.grid = grid;
        this.actors = actors;
        
        this.player = actors[actors.findIndex(actor => actor.type === 'player')];
                       
        this.height = this.grid.length;
        this.width = this.grid.reduce((memo, destArr) => {
            if (destArr.length > memo) memo = destArr.length;
                return memo;
            }, 0);

        this.status = null;
        this.finishDelay = 1;
    }
    
    isFinished() {
        if (this.status !== null && this.finishDelay < 0) return true;
        return false;
    }

    actorAt(actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error('Объект не передан или не типа Actor');
        }

        for (let i = 1; i < this.actors.length; i++) {
            if (actor.isIntersect(this.actors[i])) {
                return this.actors[i];
            }
        }
    }

    obstacleAt(position, size) {
        if(!(position instanceof Vector) || !(size instanceof Vector)) {
            throw new Error('Переданы объекты не типа Vector');
        }

        let top = Math.floor(position.y),
            bottom = Math.floor(position.y + size.y),
            left = Math.floor(position.x),
            right = Math.floor(position.x + size.x);
          
        if ((top < 0 || left < 0 || right > this.width) && bottom < this.height) return 'wall';
        else if (bottom > this.height) return 'lava';
        else {
            for (let y = top; y <= bottom; y++) {
                for (let x = left; x <= right; x++) {
                    if (this.grid[y][x] === 'lava' || this.grid[y][x] === 'wall') return this.grid[y][x];
                    else return undefined;
                }
            }
        }
    }

    removeActor(actor) {
        this.actors.splice(this.actors.indexOf(actor), 1);
    }

    noMoreActors(type) {
        /*let index = this.actors.findIndex(actor => actor.type === type);*/
        /*return (index === -1) ? true : false;*/

        return this.actors.findIndex(actor => actor.type === 'player') === -1;
    }

    playerTouched(type, actor) {
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
            return;
        }

        if (type === 'coin' && actor instanceof Actor) {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';                
            }                             
        }
    }
}

class Player extends Actor {
    constructor(pos = new Vector()) {
        pos = pos.plus(new Vector(0, -0.5));
        let size = new Vector(0.8, 1.5),
            speed = new Vector(0, 0);

        super(pos, size, speed);
    }
}

class Coin extends Actor {
    constructor(pos = new Vector()) {
        let size = new Vector(0.6, 0.6);
        pos = pos.plus(new Vector(0.2, 0.1));
        super(pos, size);

        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = rand(0, 2 * Math.PI);

        this.getNextPosition = (time = 1) => {        
            this.updateSpring(time);
            return pos.plus(this.getSpringVector());
        }        
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        let x = 0,
            y = Math.sin(this.spring ) * this.springDist;
        return new Vector(x, y);
    }

    /*getNextPosition(time = 1) {        
        this.updateSpring(time);
        return this.start.plus(this.getSpringVector());
    }*/

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        let size = new Vector(1, 1);
        super(pos, size, speed);        
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
            this.handleObstacle(next, this.size);
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

        this.handleObstacle = () => {
            this.speed = this.speed;
            this.pos = pos;
        }
    }    
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = dictionary;
    }

    actorFromSymbol(symbol) {
        if( Object.keys(this.dictionary).indexOf(symbol) === -1 || !symbol) {
            return undefined;
        } else {
            return this.dictionary[symbol];
        }
    }

    obstacleFromSymbol(symbol) {
        if (symbol === 'x') return 'wall';
        else if (symbol === '!') return 'lava';
        else return undefined;
    }

    createGrid(arrStrings = []) {
        return arrStrings
            .map(string => string.split(''))
            .map((row) => row.map(cell => this.obstacleFromSymbol(cell)));
    }

    createActors(arrStrings = []) {
        let arrActors = [];
        let parsedSchema = arrStrings.map(string => string.split(''));
        let self = this;

        for (let row = 0; row < parsedSchema.length; row++) {
            for (let cell = 0; cell < parsedSchema[row].length; cell++) {
                let content = parsedSchema[row][cell];
                let Constructor = self.actorFromSymbol(content);
            
                if (Constructor && typeof Constructor === 'function' && new Constructor() instanceof Actor) {
                    let actorPos = new Vector(cell, row);
                    let newActor = new Constructor(actorPos);    
                    arrActors.push(newActor);                      
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

const objectList = {
    'x': 'wall',
    '!': 'lava',
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain
};


//Попытка запуска игры
const schemas = [
  [
    '   v  v    ',
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
    '    v    ',
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
  'v': FireRain,
  'o': Coin
}
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));