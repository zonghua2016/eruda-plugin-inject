export function loadScript(src: string, id?: string): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) {
      resolve(document.getElementById(id) as HTMLScriptElement);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    if (id) script.id = id;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });
}