<script lang="ts">
  interface Props {
    href: string;
    icon: string;
    iconSize?: number;
    tile: string;
    iconBg: string;
    title: string;
    titleColor: string;
    subtitle: string;
    subtitleColor: string;
    /** Show a small "Soon" pill in the top-right (not-yet-wired tools). */
    soon?: boolean;
  }
  let {
    href,
    icon,
    iconSize = 20,
    tile,
    iconBg,
    title,
    titleColor,
    subtitle,
    subtitleColor,
    soon = false
  }: Props = $props();
</script>

<a href={href} class="relative block rounded-[18px] p-[14px]" style="background:{tile};">
  {#if soon}
    <span
      class="absolute right-[10px] top-[10px] rounded-full px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em]"
      style="background:rgba(255,255,255,0.7);color:{subtitleColor};"
    >
      Soon
    </span>
  {/if}
  <div
    class="mb-[10px] flex h-10 w-10 items-center justify-center rounded-[12px] text-white"
    style="background:{iconBg};font-size:{iconSize}px;"
  >
    {icon}
  </div>
  <div class="text-[15px] font-extrabold" style="color:{titleColor};">{title}</div>
  <div class="mt-[2px] text-[11px]" style="color:{subtitleColor};">{subtitle}</div>
</a>
