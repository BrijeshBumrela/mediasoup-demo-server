import User from "./User";
import { types } from "mediasoup";

export default class Meet {
    users: User[];

    constructor(public id: string, public router: types.Router) {
        this.users = [];
    }

    addUser(user: User) {
        this.users.push(user);
    }

    removeUser(user: User) {
        this.users = this.users.filter((each) => each.id !== user.id);
    }
}
