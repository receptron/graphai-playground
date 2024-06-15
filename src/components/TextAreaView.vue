<template>
  <div>
    <textarea class="w-full" :value="dataString" :rows="dataLineNumber + 2" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "HomePage",
  props: {
    dataObject: {
      type: Object,
      default() {
        return { message: "hello" };
      },
    },
  },
  setup(props) {
    const dataString = computed(() => {
      try {
        return JSON.stringify(props.dataObject, null, 2);
      } catch (e) {
        return "";
      }
    });

    const dataLineNumber = computed(() => {
      return (dataString.value || "").split("\n").length;
    });

    return {
      dataString,
      dataLineNumber,
    };
  },
});
</script>
