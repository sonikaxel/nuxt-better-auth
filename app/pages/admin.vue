<script lang="ts" setup>
// definePageMeta({ auth: { user: { role: ['admin'] } } });
const { updateUser, user } = useUserSession();

const updates = ref({
  name: user.value?.name,
});

async function handleUpdateUser() {
  try {
    await updateUser(updates.value);
  } catch (e) {
    console.log(e);
  }
}
</script>

<template>
  <h3>Admin</h3>

  <form action="" @submit.prevent="handleUpdateUser">
    <input
      type="text"
      name="name"
      id="name"
      placeholder="Name"
      v-model="updates.name"
    />
    <button type="submit">Update</button>
  </form>
</template>
