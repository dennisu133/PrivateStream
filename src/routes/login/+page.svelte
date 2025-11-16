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

  .login-card {
    @apply p-0.5 
    rounded-xl
    w-full 
    max-w-sm 
    bg-linear-to-br from-zinc-800 to-zinc-700;
  }

  .login-inner {
    @apply bg-black/70 rounded-lg px-6 py-7;
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
    border border-white/12 
    bg-white/10 
    outline-hidden 
    transition duration-200
    focus:border-blue-500/65;
  }

  button {
    @apply py-3.5 px-3.5 
    rounded-lg 
    cursor-pointer 
    transition duration-150 
    bg-linear-to-r from-blue-500 to-cyan-500
    hover:from-blue-700 hover:to-cyan-600;
  }

  .error {
    @apply px-2.5 py-2  
    rounded-md
    m-0 
    text-red-400 text-[0.95rem] 
    bg-red-500/10 
    border border-red-500/25;
  }
</style>
