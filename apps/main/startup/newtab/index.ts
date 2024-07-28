// async or defer preferred

const imgUrls = Object.values(
  import.meta.glob("./assets/*.webp", { eager: true, as: "url" }),
);

const imgUrl = imgUrls[Math.floor(Math.random() * 99)];

const style = document.createElement("style");
style.textContent = `
.outer-wrapper {
  background-image: url("chrome://noraneko${imgUrl}")
}
`;
document.head?.appendChild(style);
