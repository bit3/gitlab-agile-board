module Model {
    export class Project {
        defaultBranch:string = "master";

        constructor(public id:number, public title:string, public webUrl:string);
    }
}
