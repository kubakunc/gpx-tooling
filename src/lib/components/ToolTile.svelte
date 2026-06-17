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
    subtitleColor
  }: Props = $props();
</script>

<a href={href} class="block rounded-[18px] p-[14px]" style="background:{tile};">
  <div
    class="mb-[10px] flex h-10 w-10 items-center justify-center rounded-[12px] text-white"
    style="background:{iconBg};font-size:{iconSize}px;"
  >
    {icon}
  </div>
  <div class="text-[15px] font-extrabold" style="color:{titleColor};">{title}</div>
  <div class="mt-[2px] text-[11px]" style="color:{subtitleColor};">{subtitle}</div>
</a>
