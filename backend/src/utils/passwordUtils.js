import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

// 2. Function to compare passwords (used during Login)
export const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};