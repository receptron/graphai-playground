<template>
  <div class="flex flex-col space-y-1 bg-white p-4">
    <MenuItem link="/" icon="man" title="menu.top" @click="handleClose" />
    <MenuItem link="/list" icon="list" title="menu.list" @click="handleClose" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useStore } from "@/store/index";

import MenuItem from "@/components/MenuItem.vue";

const emitClose = "close-menu";

export default defineComponent({
  components: {
    MenuItem,
  },
  emits: [emitClose],
  setup(_, ctx) {
    const store = useStore();

    const handleClose = () => {
      ctx.emit(emitClose);
    };
    return {
      handleClose,
      store,
    };
  },
});
</script>
