<script lang="ts" setup>
const { user, session, fetchSession, loggedIn } = useUserSession();
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator />

    <ul>
      <li>
        <NuxtLink to="/">Home</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/admin">Admin</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/register">SignUp</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/login">Login</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/logout">Logout</NuxtLink>
      </li>
    </ul>

    <div>
      <button
        @click="
          () => {
            fetchSession();
          }
        "
      >
        Fetch Session
      </button>
    </div>

    <div :style="{ overflow: 'auto' }">
      <pre>User: {{ user }}</pre>
      <pre>Session: {{ session }}</pre>
      <pre>Can: {{ can(user, ['list:project']) }}</pre>
    </div>

    <NuxtPage />
  </div>
</template>
