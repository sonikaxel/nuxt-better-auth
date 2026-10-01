<script lang="ts" setup>
const credentials = ref({
  email: 'admin@example.com',
  password: 'password',
});

const signIn = useSignIn();

const handleLogin = async (e: Event) => {
  await signIn('email', {
    ...credentials.value,
    onError(error) {
      alert(error.message);
    },
    onSuccess(data, redirecting) {
      if (!redirecting) {
        navigateTo('/');
      }
    },
  });
};
</script>

<template>
  <h3>Login</h3>

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
      <button type="submit">Login</button>
    </div>
  </form>
</template>
