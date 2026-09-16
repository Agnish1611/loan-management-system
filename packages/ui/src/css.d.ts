/**
 * CSS Modules type declaration — tells TypeScript that any *.module.css
 * import returns a Record<string, string>.
 */
declare module "*.module.css" {
  const styles: { readonly [key: string]: string };
  export default styles;
}

declare module "*.css" {
  const content: string;
  export default content;
}
