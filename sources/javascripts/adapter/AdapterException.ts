/// <reference path="../ui/Progress.ts" />

module Adapter {
    export class AdapterException {
        constructor(public message: string);
    }

    export class AuthenticationException extends AdapterException {
    }
}
