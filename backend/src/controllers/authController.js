import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { BCRYPT_COST } from '../seed/seedData.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok } from '../utils/response.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../utils/token.js';

const INVALID_CREDENTIALS = 'Incorrect email or password';

// Compared against when the email is unknown, so both failure paths take the
// same time and reveal nothing about which emails are registered.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', BCRYPT_COST));

/** Sets the cookie and returns the payload for register/login. */
function startSession(res, user) {
  const token = signToken(user);
  setAuthCookie(res, token);
  // `token` is included for clients that use "Authorization: Bearer" instead of the cookie.
  return { user: user.toPublic(), token };
}

export async function register(req, res) {
  const { name, email, password, phone } = req.valid.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists', [
      { path: 'email', message: 'An account with this email already exists' },
    ]);
  }

  // The role is fixed here: public registration can only create customers.
  const user = await User.create({
    name,
    email,
    phone: phone ?? '',
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    role: 'customer',
  });

  created(res, startSession(res, user), 'Account created');
}

export async function login(req, res) {
  const { email, password } = req.valid.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !matches) throw ApiError.unauthorized(INVALID_CREDENTIALS);

  ok(res, startSession(res, user), 'Logged in');
}

export async function logout(req, res) {
  clearAuthCookie(res);
  ok(res, {}, 'Logged out');
}

export async function me(req, res) {
  ok(res, { user: req.user.toPublic() });
}
