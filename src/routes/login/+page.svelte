<script lang="ts">
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
</script>

<main>
  <div class="login-card">
    <div class="login-inner">
      <div class="stack">
        <form method="POST">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            required
          />
          <button type="submit">Enter</button>
        </form>
        {#if form?.error}
          <p class="error">{form.error}</p>
        {/if}
      </div>
    </div>
  </div>
</main>

<style lang="postcss">
  @reference "tailwindcss";

  main {
    @apply flex justify-center items-center h-screen w-screen;
  }

  .login-card {
    @apply relative 
    w-full 
    max-w-sm 
    p-0.5 
    rounded-xl
    bg-linear-to-br from-zinc-800 to-zinc-700;
  }

  .login-inner {
    @apply bg-black/70 
    backdrop-blur-md 
    rounded-lg 
    px-6 py-7;
  }

  .stack {
    @apply grid gap-3;
  }

  form {
    @apply flex flex-col gap-3;
  }

  input {
    @apply py-3.5 px-3.5 
    rounded-lg 
    border 
    border-white/12 
    bg-white/10 
    text-base
    outline-hidden 
    transition duration-200 ease-in-out
    focus:border-blue-500/65;
  }

  button {
    @apply py-3.5 px-3.5 
    rounded-lg 
    text-base 
    cursor-pointer 
    transition duration-150 ease-in-out 
    shadow-sm shadow-black/30
    bg-linear-to-r from-blue-500 to-cyan-500
    hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg;
  }

  .error {
    @apply m-0 
    text-red-400 text-[0.95rem] 
    bg-red-500/10 border 
    border-red-500/25 
    px-2.5 py-2 
    rounded-md;
  }
</style>
