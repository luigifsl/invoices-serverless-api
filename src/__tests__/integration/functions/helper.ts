import axios from 'axios';

export const BASE_URL = 'https://iq3atjppcd.execute-api.us-east-1.amazonaws.com/test'

const SIGNUP_URL = `${BASE_URL}/users/signup`;
const LOGIN_URL = `${BASE_URL}/users/login`;

const user = {
  email: 'test@test.com',
  password: 'test123',
}

export const signUp = async (email: string, password: string) => {
  const response = await axios.post(SIGNUP_URL, { email, password });
  return response.data;
};


export const login = async (email: string, password: string) => {
  const response = await axios.post(LOGIN_URL, { email, password });
  return response.data;
};

export const authenticateUser = async () => {
  let responseLogin = await login(user.email, user.password);

  if (responseLogin.status === 500 && responseLogin.message.name === 'UserNotFoundException') {
    const responseSignup = await signUp(user.email, user.password);

    if (responseSignup.status !== 200 && responseSignup.message !== `User created: ${user.email}`) {
      throw new Error('Signup failed');
    }

    responseLogin = await login(user.email, user.password);

    if (responseLogin.status !== 200) {
      throw new Error('Login failed');
    }
  }

  return responseLogin.token;
}
