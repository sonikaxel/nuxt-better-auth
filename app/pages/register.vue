<script lang="ts" setup>
const credentials = ref({
  name: 'Test User',
  email: 'user@example.com',
  password: 'Password@1',
});

const { signUp, loading } = useSignUp();

const handleSignUp = async (e: Event) => {
  await signUp('email', {
    ...credentials.value,
    callbackURL: '/',
    onError: (error) => {
      alert(error.message);
    },
  });
};
</script>

<template>
  <h3>SignUp</h3>

  <form action="" @submit.prevent="handleSignUp">
    <div>
      <label>
        Name
        <input type="text" name="name" v-model="credentials.name" />
      </label>
    </div>

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
      <button type="submit" :disabled="loading">SignUp</button>
    </div>
  </form>
</template>
