"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BcryptAdapter = void 0;
const bcryptjs_1 = require("bcryptjs");
class BcryptAdapter {
    static hash(password) {
        const salt = (0, bcryptjs_1.genSaltSync)();
        return (0, bcryptjs_1.hashSync)(password, salt);
    }
    static compare(password, hashed) {
        return (0, bcryptjs_1.compareSync)(password, hashed);
    }
}
exports.BcryptAdapter = BcryptAdapter;
