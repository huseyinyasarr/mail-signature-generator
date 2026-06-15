const baseDefaults = {
  photo: "",
  layout: "classic",
  accent: "#146c63",
  textColor: "#1f2933",
  surfaceColor: "#f3f7f5",
  fontFamily: "Arial, Helvetica, sans-serif",
  imageSize: "76",
  signatureScale: "1",
  showDivider: true,
  roundedImage: true,
  instagram: "",
  twitter: "",
  github: "",
  whatsapp: "",
};

const englishDefaults = {
  ...baseDefaults,
  name: "Jane Doe",
  title: "Marketing Manager",
  company: "Example Company",
  email: "jane.doe@example.com",
  phone: "+1 555 010 2040",
  website: "https://example.com",
  address: "123 Example Street, Sample City",
  ctaText: "Book a call",
  ctaUrl: "https://example.com/contact",
  disclaimer: "This email may contain confidential information intended only for the recipient.",
  linkedin: "https://linkedin.com/company/example",
};

const turkishDefaults = {
  ...baseDefaults,
  name: "Ayşe Yılmaz",
  title: "Pazarlama Müdürü",
  company: "Örnek Şirket",
  email: "ayse.yilmaz@example.com",
  phone: "+90 555 010 20 40",
  website: "https://example.com",
  address: "Örnek Mahallesi, 123. Sokak, İstanbul",
  ctaText: "Görüşme planla",
  ctaUrl: "https://example.com/iletisim",
  disclaimer: "Bu e-posta yalnızca alıcısı için hazırlanmış gizli bilgiler içerebilir.",
  linkedin: "https://linkedin.com/company/example",
};

const getPreferredDefaults = () => {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const isTurkish = languages.some((language) => String(language || "").toLowerCase().startsWith("tr"));
  return isTurkish ? turkishDefaults : englishDefaults;
};

const defaults = getPreferredDefaults();

let currentSurfaceColor = defaults.surfaceColor;
let currentPhotoSrc = "";
let photoSource = "dummy";
let cropImage = null;

const form = document.querySelector("#signatureForm");
const preview = document.querySelector("#signaturePreview");
const htmlOutput = document.querySelector("#htmlOutput");
const statusText = document.querySelector("#statusText");
const imageSizeValue = document.querySelector("#imageSizeValue");
const signatureScaleValue = document.querySelector("#signatureScaleValue");
const palettePreset = document.querySelector("#palettePreset");
const customPalette = document.querySelector("#customPalette");
const photoUpload = document.querySelector("#photoUpload");
const cropPanel = document.querySelector("#cropPanel");
const cropCanvas = document.querySelector("#cropCanvas");
const cropZoom = document.querySelector("#cropZoom");
const cropX = document.querySelector("#cropX");
const cropY = document.querySelector("#cropY");
const cropZoomValue = document.querySelector("#cropZoomValue");
const cropXValue = document.querySelector("#cropXValue");
const cropYValue = document.querySelector("#cropYValue");
const zoomInBtn = document.querySelector("#zoomInBtn");
const zoomOutBtn = document.querySelector("#zoomOutBtn");
const shapePreviewImages = document.querySelectorAll(".shape-previews img");
let cropDrag = null;

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeUrl = (url) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:|data:image\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getInitials = (name) =>
  String(name || "JD")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const createDummyPhoto = (name, accent) => {
  const canvas = document.createElement("canvas");
  const size = 180;
  const context = canvas.getContext("2d");
  canvas.width = size;
  canvas.height = size;

  context.fillStyle = accent || "#146c63";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#ffffff";
  context.font = "bold 64px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(getInitials(name), size / 2, size / 2 + 4);

  return canvas.toDataURL("image/png");
};

const refreshDummyPhoto = () => {
  if (photoSource !== "dummy") return;
  currentPhotoSrc = createDummyPhoto(form.elements.name.value, form.elements.accent.value);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setCropControl = (control, value) => {
  control.value = String(clamp(Number(value), Number(control.min), Number(control.max)));
};

const drawCropPreview = () => {
  if (!cropImage) return;

  const context = cropCanvas.getContext("2d");
  const size = cropCanvas.width;
  const zoom = Number(cropZoom.value);
  const offsetX = Number(cropX.value);
  const offsetY = Number(cropY.value);
  const imageRatio = cropImage.width / cropImage.height;
  const baseWidth = imageRatio > 1 ? size * imageRatio : size;
  const baseHeight = imageRatio > 1 ? size : size / imageRatio;
  const drawWidth = baseWidth * zoom;
  const drawHeight = baseHeight * zoom;
  const maxOffsetX = Math.max(0, (drawWidth - size) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - size) / 2);
  const x = (size - drawWidth) / 2 + (offsetX / 100) * maxOffsetX;
  const y = (size - drawHeight) / 2 + (offsetY / 100) * maxOffsetY;

  context.clearRect(0, 0, size, size);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(cropImage, x, y, drawWidth, drawHeight);

  const previewUrl = cropCanvas.toDataURL("image/png");
  shapePreviewImages.forEach((image) => {
    image.src = previewUrl;
  });

  cropZoomValue.textContent = `${zoom.toFixed(2)}x`;
  cropXValue.textContent = offsetX;
  cropYValue.textContent = offsetY;
};

const applyCrop = () => {
  if (!cropImage) return;
  drawCropPreview();
  currentPhotoSrc = cropCanvas.toDataURL("image/png");
  photoSource = "upload";
  render();
  setStatus("Görsel imzaya eklendi.");
};

const updateCropPositionFromDrag = (event) => {
  if (!cropDrag) return;
  const rect = cropCanvas.getBoundingClientRect();
  const deltaX = ((event.clientX - cropDrag.clientX) / rect.width) * 200;
  const deltaY = ((event.clientY - cropDrag.clientY) / rect.height) * 200;

  setCropControl(cropX, cropDrag.startX + deltaX);
  setCropControl(cropY, cropDrag.startY + deltaY);
  drawCropPreview();
};

const changeZoom = (amount) => {
  setCropControl(cropZoom, Number(cropZoom.value) + amount);
  drawCropPreview();
  applyCrop();
};

const parsePalette = (value) =>
  String(value || "")
    .match(/#?[0-9a-f]{6}|#?[0-9a-f]{3}/gi)
    ?.map((color) => {
      const hex = color.replace("#", "");
      const expanded = hex.length === 3 ? hex.split("").map((part) => `${part}${part}`).join("") : hex;
      return `#${expanded.toLowerCase()}`;
    }) || [];

const getSoftColor = (color) => {
  const [accent] = parsePalette(color);
  return accent ? `${accent}1f` : "#f3f7f5";
};

const applyPalette = (value) => {
  const [accent, textColor, surfaceColor] = parsePalette(value);
  if (!accent) {
    setStatus("Palet için en az bir hex renk gir.");
    return;
  }

  form.elements.accent.value = accent;
  if (textColor) form.elements.textColor.value = textColor;
  currentSurfaceColor = surfaceColor || getSoftColor(accent);
  refreshDummyPhoto();
  render();
  setStatus("Palet uygulandı.");
};

const getFormData = () => {
  const data = new FormData(form);
  return {
    ...Object.fromEntries(data.entries()),
    photo: currentPhotoSrc,
    surfaceColor: currentSurfaceColor,
    showDivider: form.elements.showDivider.checked,
    roundedImage: form.elements.roundedImage.checked,
  };
};

const getTokens = (data) => ({
  accent: escapeHtml(data.accent),
  textColor: escapeHtml(data.textColor),
  font: escapeHtml(data.fontFamily),
  muted: "#667085",
  pale: escapeHtml(data.surfaceColor || "#f3f7f5"),
  border: escapeHtml(data.surfaceColor || "#d8ded6"),
  neutralBorder: "#d8ded6",
});

const iconPaths = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:
    '<path d="M22 16.92v2.7a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 3.9 2 2 0 0 1 4.11 2h2.7a2 2 0 0 1 2 1.72c.12.91.32 1.8.6 2.65a2 2 0 0 1-.45 2.11L7.82 9.62a16 16 0 0 0 6.56 6.56l1.14-1.14a2 2 0 0 1 2.11-.45c.85.28 1.74.48 2.65.6A2 2 0 0 1 22 16.92z"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/>',
};

const contactIcon = (type, color = "#667085") => {
  const path = iconPaths[type] || iconPaths.web;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return `<img src="data:image/svg+xml,${encodeURIComponent(svg)}" width="14" height="14" alt="" style="display:inline-block;width:14px;height:14px;margin:0 6px 0 0;border:0;vertical-align:-2px;" />`;
};

const formatScaledPx = (value, scale) => {
  const scaled = Number(value) * scale;
  if (Number(value) <= 2) return `${Math.max(1, Math.round(scaled))}px`;
  return `${Number(scaled.toFixed(2))}px`;
};

const scaleSignatureHtml = (html, scaleValue) => {
  const scale = Number(scaleValue) || 1;
  if (Math.abs(scale - 1) < 0.001) return html;

  return html
    .replace(
      /(font-size|line-height|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|width|height|max-width):(-?\d+(?:\.\d+)?)px/g,
      (_, property, value) => `${property}:${formatScaledPx(value, scale)}`,
    )
    .replace(/\b(width|height)="(\d+(?:\.\d+)?)"/g, (_, attribute, value) => `${attribute}="${Math.round(Number(value) * scale)}"`);
};

const line = (label, value, href, color) => {
  if (!value) return "";
  const safeValue = escapeHtml(value);
  const safeHref = escapeHtml(href || value);
  return `
    <tr>
      <td style="padding:2px 12px;font-size:13px;line-height:18px;color:${color};">
        ${contactIcon(label, color)}
        <a href="${safeHref}" style="color:${color};text-decoration:none;">${safeValue}</a>
      </td>
    </tr>`;
};

const socialLink = (label, url, accent) => {
  const href = normalizeUrl(url);
  if (!href) return "";
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-right:8px;color:${accent};font-size:12px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>`;
};

const socialPill = (label, url, accent) => {
  const href = normalizeUrl(url);
  if (!href) return "";
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 6px 6px 0;padding:4px 8px;border:1px solid ${accent};border-radius:999px;color:${accent};font-size:11px;line-height:14px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>`;
};

const socialTextLinks = (data, separator = " | ") =>
  [
    socialLink("LinkedIn", data.linkedin, data.accent),
    socialLink("Instagram", data.instagram, data.accent),
    socialLink("X", data.twitter, data.accent),
    socialLink("GitHub", data.github, data.accent),
    socialLink("WhatsApp", data.whatsapp, data.accent),
  ]
    .filter(Boolean)
    .join(`<span style="color:#c7ced6;">${separator}</span>`);

const imageCell = (data) => {
  const size = Number(data.imageSize) || 76;
  const radius = data.roundedImage ? "999px" : "8px";
  if (!data.photo) return "";
  return `
    <td valign="top" style="padding:0 16px 0 0;">
      <img src="${escapeHtml(normalizeUrl(data.photo))}" width="${size}" height="${size}" alt="${escapeHtml(data.name)}" style="display:block;width:${size}px;height:${size}px;object-fit:cover;border:0;border-radius:${radius};" />
    </td>`;
};

const detailsTable = (data) => {
  const { accent, textColor, muted, pale } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const ctaUrl = normalizeUrl(data.ctaUrl);
  const socials = [
    socialLink("LinkedIn", data.linkedin, accent),
    socialLink("Instagram", data.instagram, accent),
    socialLink("X", data.twitter, accent),
    socialLink("GitHub", data.github, accent),
    socialLink("WhatsApp", data.whatsapp, accent),
  ]
    .filter(Boolean)
    .join('<span style="display:inline-block;margin-right:8px;color:#c7ced6;">|</span>');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:${pale};border-left:3px solid ${accent};">
      <tr>
        <td style="padding:10px 12px 4px;font-family:${escapeHtml(data.fontFamily)};">
          <div style="font-size:18px;line-height:22px;font-weight:bold;color:${textColor};">${escapeHtml(data.name)}</div>
          <div style="font-size:13px;line-height:18px;color:${muted};">${escapeHtml(data.title)}${data.company ? ` · ${escapeHtml(data.company)}` : ""}</div>
        </td>
      </tr>
      ${data.showDivider ? `<tr><td style="padding:7px 12px;"><div style="height:2px;width:42px;background:${accent};line-height:2px;font-size:2px;">&nbsp;</div></td></tr>` : ""}
      ${line("mail", data.email, `mailto:${data.email}`, textColor)}
      ${line("phone", data.phone, `tel:${data.phone.replace(/\s/g, "")}`, textColor)}
      ${line("web", data.website, websiteUrl, textColor)}
      ${data.address ? `<tr><td style="padding:2px 12px;font-size:13px;line-height:18px;color:${textColor};">${escapeHtml(data.address).replace(/\n/g, "<br />")}</td></tr>` : ""}
      ${socials ? `<tr><td style="padding:8px 12px 0;">${socials}</td></tr>` : ""}
      ${ctaUrl && data.ctaText ? `<tr><td style="padding:10px 12px 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:12px;font-weight:bold;line-height:16px;padding:8px 12px;border-radius:6px;">${escapeHtml(data.ctaText)}</a></td></tr>` : ""}
      ${data.disclaimer ? `<tr><td style="padding:10px 12px 10px;max-width:430px;font-size:10px;line-height:14px;color:#98a2b3;">${escapeHtml(data.disclaimer).replace(/\n/g, "<br />")}</td></tr>` : ""}
    </table>`;
};

const contactRow = (label, value, href, color) => {
  if (!value) return "";
  return `<span style="display:inline-block;margin:0 12px 5px 0;font-size:12px;line-height:17px;color:${color};">${contactIcon(label)}<a href="${escapeHtml(href || value)}" style="color:${color};text-decoration:none;">${escapeHtml(value)}</a></span>`;
};

const disclaimerRow = (data) =>
  data.disclaimer
    ? `<tr><td style="padding-top:10px;max-width:520px;font-size:10px;line-height:14px;color:#98a2b3;">${escapeHtml(data.disclaimer).replace(/\n/g, "<br />")}</td></tr>`
    : "";

const buildClassic = (data) => {
  const { font } = getTokens(data);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${font};">
  <tr>
    ${imageCell(data)}
    <td valign="top" style="padding:0;">${detailsTable(data)}</td>
  </tr>
</table>`.trim();
};

const buildBrand = (data) => {
  const { accent, textColor, font, muted, pale, neutralBorder } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const ctaUrl = normalizeUrl(data.ctaUrl);
  const socials = [
    socialPill("LinkedIn", data.linkedin, accent),
    socialPill("Instagram", data.instagram, accent),
    socialPill("X", data.twitter, accent),
    socialPill("GitHub", data.github, accent),
    socialPill("WhatsApp", data.whatsapp, accent),
  ].join("");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;border-collapse:separate;border-spacing:0;font-family:${font};border:1px solid ${neutralBorder};border-radius:8px;overflow:hidden;">
  <tr>
    <td style="width:7px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td>
    <td style="padding:16px;background:${pale};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          ${data.photo ? `<td valign="top" style="width:66px;padding:0 14px 0 0;"><img src="${escapeHtml(normalizeUrl(data.photo))}" width="58" height="58" alt="${escapeHtml(data.company || data.name)}" style="display:block;width:58px;height:58px;object-fit:cover;border:0;border-radius:${data.roundedImage ? "999px" : "8px"};" /></td>` : ""}
          <td valign="top" style="padding:0;">
            <div style="font-size:18px;line-height:22px;font-weight:bold;color:${textColor};">${escapeHtml(data.name)}</div>
            <div style="padding-top:2px;font-size:13px;line-height:18px;color:${muted};">${escapeHtml(data.title)}</div>
            ${data.company ? `<div style="padding-top:8px;font-size:12px;line-height:16px;font-weight:bold;color:${accent};text-transform:uppercase;">${escapeHtml(data.company)}</div>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="width:7px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td>
    <td style="padding:13px 16px;background:#ffffff;border-top:4px solid ${pale};">
      <div>
        ${contactRow("mail", data.email, `mailto:${data.email}`, textColor)}
        ${contactRow("phone", data.phone, `tel:${data.phone.replace(/\s/g, "")}`, textColor)}
        ${contactRow("web", data.website, websiteUrl, accent)}
      </div>
      ${data.address ? `<div style="font-size:12px;line-height:17px;color:${muted};">${escapeHtml(data.address).replace(/\n/g, "<br />")}</div>` : ""}
      ${socials ? `<div style="padding-top:8px;">${socials}</div>` : ""}
      ${ctaUrl && data.ctaText ? `<div style="padding-top:8px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;color:#ffffff;background:${accent};text-decoration:none;font-size:12px;font-weight:bold;line-height:16px;padding:7px 11px;border-radius:6px;">${escapeHtml(data.ctaText)}</a></div>` : ""}
      ${data.disclaimer ? `<div style="padding-top:10px;font-size:10px;line-height:14px;color:#98a2b3;">${escapeHtml(data.disclaimer).replace(/\n/g, "<br />")}</div>` : ""}
    </td>
  </tr>
</table>`.trim();
};

const buildBanner = (data) => {
  const { accent, textColor, font, muted, pale } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const ctaUrl = normalizeUrl(data.ctaUrl);
  const socials = socialTextLinks(data, " | ");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-collapse:collapse;font-family:${font};">
  <tr>
    <td style="padding:0 0 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:${accent};">
        <tr>
          <td style="padding:12px 14px;color:#ffffff;">
            <div style="font-size:17px;line-height:21px;font-weight:bold;color:#ffffff;">${escapeHtml(data.name)}</div>
            <div style="font-size:12px;line-height:16px;color:#ffffff;">${escapeHtml(data.title)}${data.company ? `, ${escapeHtml(data.company)}` : ""}</div>
          </td>
          ${data.photo ? `<td align="right" style="width:74px;padding:8px 12px 8px 0;"><img src="${escapeHtml(normalizeUrl(data.photo))}" width="54" height="54" alt="${escapeHtml(data.name)}" style="display:block;width:54px;height:54px;object-fit:cover;border:2px solid #ffffff;border-radius:${data.roundedImage ? "999px" : "8px"};" /></td>` : ""}
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px;background:${pale};border-left:3px solid ${accent};">
      <div style="font-size:12px;line-height:18px;color:${textColor};">
        ${data.email ? `<a href="mailto:${escapeHtml(data.email)}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.email)}</a>` : ""}
        ${data.phone ? ` <span style="color:#c7ced6;">|</span> <a href="tel:${escapeHtml(data.phone.replace(/\s/g, ""))}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.phone)}</a>` : ""}
        ${data.website ? ` <span style="color:#c7ced6;">|</span> <a href="${escapeHtml(websiteUrl)}" style="color:${accent};text-decoration:none;">${escapeHtml(data.website)}</a>` : ""}
      </div>
      ${data.address ? `<div style="padding-top:2px;font-size:12px;line-height:17px;color:${muted};">${escapeHtml(data.address).replace(/\n/g, "<br />")}</div>` : ""}
      ${socials ? `<div style="padding-top:6px;font-size:12px;line-height:17px;">${socials}</div>` : ""}
      ${ctaUrl && data.ctaText ? `<div style="padding-top:8px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;color:${accent};border:1px solid ${accent};text-decoration:none;font-size:12px;font-weight:bold;line-height:16px;padding:6px 10px;border-radius:6px;">${escapeHtml(data.ctaText)}</a></div>` : ""}
      ${data.disclaimer ? `<div style="padding-top:8px;font-size:10px;line-height:14px;color:#98a2b3;">${escapeHtml(data.disclaimer).replace(/\n/g, "<br />")}</div>` : ""}
    </td>
  </tr>
</table>`.trim();
};

const buildMinimal = (data) => {
  const { accent, textColor, font, muted, pale } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const socials = socialTextLinks(data, " | ");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${font};background:${pale};">
  <tr>
    <td style="padding:8px 10px 5px;font-size:14px;line-height:19px;color:${textColor};">
      <strong>${escapeHtml(data.name)}</strong>${data.company ? ` <span style="color:${muted};">from ${escapeHtml(data.company)}</span>` : ""}
    </td>
  </tr>
  <tr>
    <td style="padding:0 10px;font-size:12px;line-height:18px;color:${muted};">
      ${data.title ? `${escapeHtml(data.title)}<br />` : ""}
      ${data.email ? `<a href="mailto:${escapeHtml(data.email)}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.email)}</a>` : ""}
      ${data.phone ? ` <span style="color:#c7ced6;">|</span> <a href="tel:${escapeHtml(data.phone.replace(/\s/g, ""))}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.phone)}</a>` : ""}
      ${data.website ? ` <span style="color:#c7ced6;">|</span> <a href="${escapeHtml(websiteUrl)}" style="color:${accent};text-decoration:none;">${escapeHtml(data.website)}</a>` : ""}
    </td>
  </tr>
  ${socials ? `<tr><td style="padding:5px 10px 0;font-size:12px;line-height:17px;">${socials}</td></tr>` : ""}
  ${disclaimerRow(data)}
</table>`.trim();
};

const buildSplit = (data) => {
  const { accent, textColor, font, muted, pale } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const ctaUrl = normalizeUrl(data.ctaUrl);
  const socials = socialTextLinks(data, " | ");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-collapse:collapse;font-family:${font};">
  <tr>
    <td valign="top" style="width:190px;padding:14px 16px;background:${pale};border-right:4px solid ${accent};">
      ${data.photo ? `<img src="${escapeHtml(normalizeUrl(data.photo))}" width="62" height="62" alt="${escapeHtml(data.name)}" style="display:block;width:62px;height:62px;object-fit:cover;border:0;border-radius:${data.roundedImage ? "999px" : "8px"};margin-bottom:10px;" />` : ""}
      <div style="font-size:18px;line-height:22px;font-weight:bold;color:${textColor};">${escapeHtml(data.name)}</div>
      <div style="padding-top:3px;font-size:12px;line-height:17px;color:${muted};">${escapeHtml(data.title)}</div>
      ${data.company ? `<div style="padding-top:8px;font-size:12px;line-height:16px;font-weight:bold;color:${accent};">${escapeHtml(data.company)}</div>` : ""}
    </td>
    <td valign="top" style="padding:14px 12px 14px 16px;background:${pale};">
      <div style="font-size:12px;line-height:19px;color:${textColor};">
        ${data.email ? `<div>${contactIcon("mail")}<a href="mailto:${escapeHtml(data.email)}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.email)}</a></div>` : ""}
        ${data.phone ? `<div>${contactIcon("phone")}<a href="tel:${escapeHtml(data.phone.replace(/\s/g, ""))}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.phone)}</a></div>` : ""}
        ${data.website ? `<div>${contactIcon("web")}<a href="${escapeHtml(websiteUrl)}" style="color:${accent};text-decoration:none;">${escapeHtml(data.website)}</a></div>` : ""}
      </div>
      ${data.address ? `<div style="padding-top:7px;font-size:12px;line-height:17px;color:${muted};">${escapeHtml(data.address).replace(/\n/g, "<br />")}</div>` : ""}
      ${socials ? `<div style="padding-top:8px;font-size:12px;line-height:17px;">${socials}</div>` : ""}
      ${ctaUrl && data.ctaText ? `<div style="padding-top:9px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:12px;font-weight:bold;line-height:16px;padding:7px 11px;border-radius:6px;">${escapeHtml(data.ctaText)}</a></div>` : ""}
      ${data.disclaimer ? `<div style="padding-top:9px;font-size:10px;line-height:14px;color:#98a2b3;">${escapeHtml(data.disclaimer).replace(/\n/g, "<br />")}</div>` : ""}
    </td>
  </tr>
</table>`.trim();
};

const buildStamp = (data) => {
  const { accent, textColor, font, muted, pale, border } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const socials = socialTextLinks(data, " | ");
  const initials = escapeHtml(
    String(data.company || data.name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase(),
  );
  const stampMark = data.photo
    ? `<img src="${escapeHtml(normalizeUrl(data.photo))}" width="70" height="70" alt="${escapeHtml(data.name)}" style="display:block;width:70px;height:70px;object-fit:cover;border:0;border-radius:${data.roundedImage ? "999px" : "6px"};" />`
    : initials;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${font};">
  <tr>
    <td valign="middle" style="width:70px;height:70px;border:2px solid ${accent};background:${pale};border-radius:${data.photo && data.roundedImage ? "999px" : "8px"};text-align:center;color:${accent};font-size:20px;line-height:70px;font-weight:bold;overflow:hidden;">${stampMark}</td>
    <td valign="middle" style="padding:8px 10px 8px 14px;background:${pale};">
      <div style="font-size:16px;line-height:20px;font-weight:bold;color:${textColor};">${escapeHtml(data.name)}</div>
      <div style="font-size:12px;line-height:17px;color:${muted};">${escapeHtml(data.title)}${data.company ? ` | ${escapeHtml(data.company)}` : ""}</div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid ${border};font-size:12px;line-height:18px;color:${textColor};">
        ${data.email ? `<a href="mailto:${escapeHtml(data.email)}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.email)}</a>` : ""}
        ${data.phone ? ` <span style="color:#c7ced6;">|</span> <a href="tel:${escapeHtml(data.phone.replace(/\s/g, ""))}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.phone)}</a>` : ""}
        ${data.website ? ` <span style="color:#c7ced6;">|</span> <a href="${escapeHtml(websiteUrl)}" style="color:${accent};text-decoration:none;">${escapeHtml(data.website)}</a>` : ""}
      </div>
      ${socials ? `<div style="padding-top:5px;font-size:12px;line-height:17px;">${socials}</div>` : ""}
      ${data.disclaimer ? `<div style="padding-top:8px;max-width:430px;font-size:10px;line-height:14px;color:#98a2b3;">${escapeHtml(data.disclaimer).replace(/\n/g, "<br />")}</div>` : ""}
    </td>
  </tr>
</table>`.trim();
};

const buildLetter = (data) => {
  const { accent, textColor, font, muted, pale, border } = getTokens(data);
  const websiteUrl = normalizeUrl(data.website);
  const socials = socialTextLinks(data, " | ");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:500px;border-collapse:collapse;font-family:${font};background:${pale};">
  <tr>
    <td style="padding:10px 12px;border-bottom:1px solid ${border};">
      <div style="font-size:15px;line-height:20px;color:${textColor};"><strong>${escapeHtml(data.name)}</strong></div>
      <div style="font-size:12px;line-height:17px;color:${muted};">${escapeHtml(data.title)}${data.company ? ` | ${escapeHtml(data.company)}` : ""}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:9px 12px 0;font-size:12px;line-height:18px;color:${textColor};">
      ${data.email ? `<a href="mailto:${escapeHtml(data.email)}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.email)}</a>` : ""}
      ${data.phone ? ` <span style="color:#c7ced6;">|</span> <a href="tel:${escapeHtml(data.phone.replace(/\s/g, ""))}" style="color:${textColor};text-decoration:none;">${escapeHtml(data.phone)}</a>` : ""}
      ${data.website ? ` <span style="color:#c7ced6;">|</span> <a href="${escapeHtml(websiteUrl)}" style="color:${accent};text-decoration:none;">${escapeHtml(data.website)}</a>` : ""}
      ${data.address ? `<br /><span style="color:${muted};">${escapeHtml(data.address).replace(/\n/g, "<br />")}</span>` : ""}
    </td>
  </tr>
  ${socials ? `<tr><td style="padding:6px 12px 0;font-size:12px;line-height:17px;">${socials}</td></tr>` : ""}
  ${disclaimerRow(data)}
</table>`.trim();
};

const buildSignatureHtml = (data) => {
  const builders = {
    classic: buildClassic,
    brand: buildBrand,
    banner: buildBanner,
    minimal: buildMinimal,
    split: buildSplit,
    stamp: buildStamp,
    letter: buildLetter,
  };

  return scaleSignatureHtml((builders[data.layout] || buildClassic)(data), data.signatureScale);
};

const render = () => {
  const data = getFormData();
  const html = buildSignatureHtml(data);
  preview.innerHTML = html;
  htmlOutput.value = html;
  imageSizeValue.textContent = `${data.imageSize}px`;
  signatureScaleValue.textContent = `${Math.round((Number(data.signatureScale) || 1) * 100)}%`;
};

const setStatus = (message) => {
  statusText.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    statusText.textContent = "";
  }, 2800);
};

const copyHtml = async (html) => {
  if (navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([preview.innerText], { type: "text/plain" }),
      }),
    ]);
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(preview);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("copy");
  selection.removeAllRanges();
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  htmlOutput.focus();
  htmlOutput.select();
  document.execCommand("copy");
};

const loadDefaults = () => {
  currentSurfaceColor = defaults.surfaceColor;
  photoSource = "dummy";
  cropImage = null;
  palettePreset.value = "";
  customPalette.value = "";
  photoUpload.value = "";
  cropPanel.hidden = true;

  Object.entries(defaults).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (key === "photo") return;
    if (field instanceof RadioNodeList) {
      const radio = [...field].find((item) => item.value === value);
      if (radio) radio.checked = true;
      return;
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }
    field.value = value;
  });
  refreshDummyPhoto();
  render();
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add("is-active");
  });
});

palettePreset.addEventListener("change", () => {
  if (!palettePreset.value) return;
  customPalette.value = palettePreset.value;
  applyPalette(palettePreset.value);
});

document.querySelector("#applyPaletteBtn").addEventListener("click", () => {
  applyPalette(customPalette.value || palettePreset.value);
});

customPalette.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyPalette(customPalette.value);
  }
});

photoUpload.addEventListener("change", () => {
  const [file] = photoUpload.files || [];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Lütfen bir görsel dosyası seç.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      cropImage = image;
      cropZoom.value = "1";
      cropX.value = "0";
      cropY.value = "0";
      cropPanel.hidden = false;
      drawCropPreview();
      applyCrop();
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);
});

[cropZoom, cropX, cropY].forEach((control) => {
  control.addEventListener("input", drawCropPreview);
  control.addEventListener("change", applyCrop);
});

cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropImage) return;
  cropCanvas.setPointerCapture(event.pointerId);
  cropDrag = {
    clientX: event.clientX,
    clientY: event.clientY,
    startX: Number(cropX.value),
    startY: Number(cropY.value),
  };
});

cropCanvas.addEventListener("pointermove", updateCropPositionFromDrag);

cropCanvas.addEventListener("pointerup", (event) => {
  if (!cropDrag) return;
  updateCropPositionFromDrag(event);
  cropDrag = null;
  applyCrop();
});

cropCanvas.addEventListener("pointercancel", () => {
  cropDrag = null;
});

zoomOutBtn.addEventListener("click", () => changeZoom(-0.1));
zoomInBtn.addEventListener("click", () => changeZoom(0.1));

document.querySelector("#applyCropBtn").addEventListener("click", applyCrop);

document.querySelector("#removePhotoBtn").addEventListener("click", () => {
  currentPhotoSrc = "";
  photoSource = "none";
  cropImage = null;
  photoUpload.value = "";
  cropPanel.hidden = true;
  render();
  setStatus("Görsel kaldırıldı.");
});

form.addEventListener("input", (event) => {
  if (event.target === form.elements.name || event.target === form.elements.accent) {
    refreshDummyPhoto();
  }
  render();
});
form.addEventListener("change", (event) => {
  if (event.target === form.elements.name || event.target === form.elements.accent) {
    refreshDummyPhoto();
  }
  render();
});

document.querySelector("#copyRichBtn").addEventListener("click", async () => {
  try {
    await copyHtml(preview.innerHTML);
    setStatus("İmza kopyalandı.");
  } catch (error) {
    htmlOutput.select();
    document.execCommand("copy");
    setStatus("Tarayıcı zengin kopyalamayı engelledi; HTML kaynak kopyalandı.");
  }
});

document.querySelector("#copyHtmlBtn").addEventListener("click", async () => {
  try {
    await copyText(htmlOutput.value);
    setStatus("HTML kodu kopyalandı.");
  } catch (error) {
    setStatus("HTML seçilemedi; kaynak alandan manuel kopyala.");
  }
});

document.querySelector("#selectHtmlBtn").addEventListener("click", () => {
  htmlOutput.focus();
  htmlOutput.select();
  setStatus("HTML seçildi.");
});

document.querySelector("#resetBtn").addEventListener("click", loadDefaults);

loadDefaults();
