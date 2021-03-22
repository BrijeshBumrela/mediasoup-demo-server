import User from '../models/User';
import Meet from '../models/Meet';

export default (meetings: Meet[]) => {
    const findMeeting = (id: string) =>
        meetings.find(meeting => meeting.id === id);

    const findUser = (id: string, field?: string) => {
        const key = field || 'id';

        let user: User | undefined;

        meetings.forEach(meeting => {
            meeting.users.forEach(friend => {
                if (friend[key] === id) {
                    user = friend;
                    return;
                }
            });
        });

        return user;
    };

    // this function takes two arguments
    /**
     *
     * @param id - value of the string that is to be compared in the users array
     * @param field - (optional) field that you want to compare (default `id`)
     */
    const findUserAndMeeting = (
        id: string,
        field?: string
    ): [User | null, Meet | null] => {
        let selectedUser: User | null = null;
        let userMeeting: Meet | null = null;

        const key = field || 'id';

        meetings.forEach(meeting => {
            meeting.users.forEach(user => {
                if (user[key] === id) {
                    selectedUser = user;
                    userMeeting = meeting;
                    return;
                }
            });
        });

        return [selectedUser, userMeeting];
    };

    const genRandNumber = (maxLength: number) => {
        return Math.floor(Math.random() * maxLength);
    };

    return { findMeeting, findUserAndMeeting, genRandNumber, findUser };
};
