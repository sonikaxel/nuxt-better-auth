<script lang="ts" setup>
const { signOut } = useUserSession();

onMounted(() => {
  signOut({
    // onSuccess() {
    //   navigateTo('/login');
    // },
  });
});
</script>

<template>
  <h3>Logout</h3>
  <p>Please wait...</p>
</template>
