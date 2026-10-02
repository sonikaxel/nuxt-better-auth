<script lang="ts" setup>
const credentials = ref({
  email: 'admin@example.com',
  password: 'password',
});

const { signIn, loading } = useSignIn();

const handleLogin = async (e: Event) => {
  await signIn('email', {
    ...credentials.value,
    callbackURL: '/',
    onError(error) {
      alert(error.message);
    },
    onSuccess(data) {
      console.log('Logged-in');
    },
  });
};
</script>

<template>
  <h3>Login</h3>

  <div v-if="loading">Loading...</div>
  <form action="" @submit.prevent="handleLogin">
    <div>
      <label>
        Email
        <input type="email" name="email" v-model="credentials.email" />
      </label>
    </div>

    <div>
      <label>
        Password
        <input type="password" name="password" v-model="credentials.password" />
      </label>
    </div>

    <div>
      <button type="submit" :disabled="loading">Login</button>
    </div>
  </form>
</template>
