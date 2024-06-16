<template>
  <div ref="editorRef">
  </div>
</template>

<script lang="ts">
  
import ace, { type Ace } from "ace-builds";
import { capitalize, defineComponent, markRaw, h, ref, watch, onMounted, onBeforeUnmount } from "vue";
import ResizeObserver from "resize-observer-polyfill";

import type { VAceEditorInstance } from "./types";

const Events = ["blur", "input", "change", "changeSelectionStyle", "changeSession", "copy", "focus", "paste"];

export default defineComponent({
  name: "VAceEditor",
  props: {
    value: {
      type: String,
      required: true,
    },
    lang: {
      type: String,
      default: "text",
    },
    theme: {
      type: String,
      default: "chrome",
    },
    options: {
      type: Object,
      default: () => {
        return {};
      },
    },
    placeholder: {
      type: String,
      default: "",
    },
    readonly: Boolean,
    wrap: Boolean,
    printMargin: {
      type: [Boolean, Number],
      default: true,
    },
    minLines: {
      type: Number,
      default: undefined,
    },
    maxLines: {
      type: Number,
      default: 1000,
    },
  },
  emits: ["update:value", "init", ...Events],
  setup(props, {emit}) {
    const editorRef = ref(null);
    let editor;
    let resizeObserver;
    let isSettingContent = false;
    let contentBackup = props.value;
    
    onMounted(() => {
      editor = ace.edit(editorRef.value, {
        placeholder: props.placeholder,
        readOnly: props.readonly,
        value: props.value,
        mode: `ace/mode/${props.lang}`,
        theme: `ace/theme/${props.theme}`,
        wrap: props.wrap,
        printMargin: props.printMargin,
        useWorker: false,
        minLines: props.minLines,
        maxLines: props.maxLines,
        ...props.options,
      });

      editor.on('change', () => {
        if (isSettingContent) return;
        const content = editor.getValue();
        contentBackup = content;
        emit('update:value', content);
      });
      
      Events.forEach((x) => {
        const eventName = `on${capitalize(x)}`;
        if (typeof emit[eventName] === 'function') {
          editor.on(x, emit.bind(this, x));
        }
      });
      
      resizeObserver = new ResizeObserver(() => editor.resize());
      resizeObserver.observe(editorRef.value);
      emit('init', editor);
    });
    
    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      editor?.destroy();
    });
    
    watch(
      () => props.value,
      (newValue) => {
        if (contentBackup !== newValue) {
          try {
            isSettingContent = true;
            editor.setValue(newValue, 1);
          } finally {
            isSettingContent = false;
          }
          contentBackup = newValue;
        }
      },
    );
    
    watch(
      () => props.theme,
      (newTheme) => {
        editor.setTheme(`ace/theme/${newTheme}`);
      },
    );
    
    watch(
      () => props.options,
      (newOptions) => {
        editor.setOptions(newOptions);
      },
    );
    
    watch(
      () => props.readonly,
      (newReadonly) => {
        editor.setReadOnly(newReadonly);
      },
    );
    
    watch(
      () => props.placeholder,
      (newPlaceholder) => {
        editor.setOption('placeholder', newPlaceholder);
      },
    );
    
    watch(
      () => props.wrap,
      (newWrap) => {
        editor.setWrapBehavioursEnabled(newWrap);
      },
    );
    
    watch(
      () => props.printMargin,
      (newPrintMargin) => {
        editor.setOption('printMargin', newPrintMargin);
      },
    );
    
    watch(
      () => props.lang,
      (newLang) => {
        editor.setOption('mode', `ace/mode/${newLang}`);
      },
    );
    
    watch(
      () => props.minLines,
      (newMinLines) => {
        editor.setOption('minLines', newMinLines);
      },
    );
    
    watch(
      () => props.maxLines,
      (newMaxLines) => {
        editor.setOption('maxLines', newMaxLines);
      },
    );
    
    const focus = () => editor.focus();
    const blur = () => editor.blur();
    const selectAll = () => editor.selectAll();
    const getAceInstance = () => editor;

    return {
      editorRef,
      focus,
      blur,
      selectAll,
      getAceInstance,
    }
  },
});

</script>
