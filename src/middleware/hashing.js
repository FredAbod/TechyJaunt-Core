import bcrypt from 'bcryptjs';
const saltRounds = 10;

const passwordHash = async (data) => {
    try {
        // bcryptjs doesn't have an async genSalt that returns a promise in all versions,
        // but its API mirrors bcrypt; use the async-style wrapper for compatibility.
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(data, salt);
        return hash;
    } catch (error) {
        return false;
    }
};

const passwordCompare = async (data, hash) => {
    try {
        const matchedPassword = await bcrypt.compare(data, hash);
        return matchedPassword;
    } catch (error) {
        return false;
    }
};

export  {passwordCompare,passwordHash};