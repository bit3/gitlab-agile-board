module Model {
    export class Issue {
        open:boolean = false;
        labels:Label[] = [];

        constructor(public id:number, public title:string, public url:string);
    }
}
