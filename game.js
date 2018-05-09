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
    // не опускайте аргументы конструктора Vector,
    // лучше писать new Vector(0, 0) чем new Vector
    // в таком случае, если кто-то исменит значения по-умолчанию
    // в констукторе Vector ваш код не сломается
    constructor (objPos = new Vector(), objSize = new Vector(1, 1), objSpeed = new Vector()) {
        
        if (!(objPos instanceof Vector) || !(objSize instanceof Vector) || !(objSpeed instanceof Vector)) {
            throw new Error('Передан объект не типа Vector.');
        }
        
        this.pos = objPos;
        this.size = objSize;
        this.speed = objSpeed;

        // для определения свойств класса используйте синтаксис ES6
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
                    // type можен не совпадать с именем класса, тут нужно просто возвращает строку
                    // причём в каждом классе свою
                    if (this.constructor.name.toLowerCase().indexOf('fire') !== -1) return 'fireball';
                    else return this.constructor.name.toLowerCase();
                }
            },
        });
    }
    
    act() {}
    
    isIntersect(actor) {
        // первая половина проверки лишняя, т.к. undefined instanceof Actor это false
        if (!actor || !(actor instanceof Actor)) {
            throw new Error('Аргумент не передан или не является типом Actor');
        }
        // не опускайте фигурные скобки
        if(actor === this) return false;
        // else тут не нужен, т.к. если выполнение зайдёт в if, произойдёт выход из функции (там return)
        else if (this.left >= actor.right || this.right <= actor.left || this.bottom <= actor.top || this.top >= actor.bottom) return false;
        
        return true; 
    }
}

class Level {
    constructor(grid = [], actors = []) {
        
        this.grid = grid;
        this.actors = actors;
        // есть специальный метод для поиска в массиве, который возвращает объект
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
        // тут не нужен if, лучше просто написать return <выращение в if>
        if (this.status !== null && this.finishDelay < 0) return true;
        return false;
    }

    actorAt(actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error('Объект не передан или не типа Actor');
        }

        // используйте методя для поиска в массиве
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

        // если значение присваивается переменной один раз, используйте const
        // (на это обращают внимание при финальной проверке диплома)
        // не объявляйте переменные через запятую, это затрудняет модификацию кода
        // например, если вы захотите объявить bottom как const, а остальные переменные оставить let,
        // вам нужно будет преносить строчку, вместо того, чтобы поменить одно слово
        let top = Math.floor(position.y),
            bottom = Math.floor(position.y + size.y),
            left = Math.floor(position.x),
            right = Math.floor(position.x + size.x);

        // не опускайте фигурные скобки
        if (top < 0 || left < 0 || right > this.width) return 'wall';
        // else тут не нужен
        else if (bottom >= this.height) return 'lava';
        
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                // в if достаточно проверить что this.grid[y][x] не пустой
                // представьте, что потребуется добавить новый вид препытствий
                // придётся менять больше кода чем нучно
                if (this.grid[y][x] === 'lava' || this.grid[y][x] === 'wall') return this.grid[y][x];
            }
        }        
    }

    removeActor(actor) {
        // если объект не будет найден, методя отработает неправильно
        this.actors.splice(this.actors.indexOf(actor), 1);
    }

    noMoreActors(type) {
        // тут лучше исползовать метод some
        // и вы не используете переданный аргумент
        return this.actors.findIndex(actor => actor.type === 'player') === -1;
    }

    playerTouched(type, actor) {
        // не опускайте фигурные скобки
        if (this.status !== null) return;

        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
            return;
        }

        if (type === 'coin' &&  actor instanceof Actor) {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';                
            }                             
        }
    }   
}

class Player extends Actor {
    // не опускайте аргументы конструктора Vector
    constructor(pos = new Vector()) {
        pos = pos.plus(new Vector(0, -0.5));
        // не объявляйте переменный через запятую
        let size = new Vector(0.8, 1.5),
            speed = new Vector(0, 0);

        super(pos, size, speed);
    }
}

class Coin extends Actor {
    // см. предыдущие замечания
    constructor(pos = new Vector()) {
        let size = new Vector(0.6, 0.6);
        pos = pos.plus(new Vector(0.2, 0.1));
        super(pos, size);

        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = rand(0, 2 * Math.PI);

        // почему вы не объявили это как обычный метод?
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

        // вторая половина проверки некорректна
        // эта ситуация должна обрабатываться в метода obstacleAt
        if (level.obstacleAt(next, this.size) || next.x + 1 > level.width) {
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
        // почему ну обычный метод?
        this.handleObstacle = () => {
            this.speed = this.speed; // ?
            this.pos = pos;
        }    
    }    
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = dictionary;
    }

    actorFromSymbol(symbol) {
        // что изменится если убрать эту проверку?
        if( Object.keys(this.dictionary).indexOf(symbol) === -1 || !symbol) {
            return undefined;
        } else {
            return this.dictionary[symbol];
        }
    }

    obstacleFromSymbol(symbol) {
        if (symbol === 'x') return 'wall';
        // else можно бурать
        else if (symbol === '!') return 'lava';
        // это лишняя строчка,
        // функция и так возвращает undefined
        // если не явно не указано другое
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
        // зачем?
        let self = this;

        for (let row = 0; row < parsedSchema.length; row++) {
            for (let cell = 0; cell < parsedSchema[row].length; cell++) {
                let content = parsedSchema[row][cell];
                let Constructor = self.actorFromSymbol(content);
                // первую проверку можно убрать
                // третью лучше проверить другим спосбом - проверить тип newActor
                // чтобы не создавать объект 2 раза
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

// эта переменная не используется
const objectList = {
    'x': 'wall',
    '!': 'lava',
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain
};

// Схемы лучше возьмите из файла levels.json
//Попытка запуска игры
const schema = [
  ' | v    v',
  '         ',
  '    =    ',
  'o        ',
  '         ',
  ' @       ',
  'xxx!     ',
  '         '
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