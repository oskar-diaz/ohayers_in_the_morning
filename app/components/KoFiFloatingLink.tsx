const koFiWidgetHtml = `<!doctype html>
<html>
  <head>
    <base target="_blank">
    <style>
      html,
      body {
        margin: 0;
        overflow: hidden;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript" src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"></script>
    <script type="text/javascript">
      kofiwidget2.init('Págame un cortado', '#72a4f2', 'I2Z220BEEN');
      kofiwidget2.draw();
    </script>
  </body>
</html>`;

export default function KoFiFloatingLink() {
  return (
    <iframe
      title="Págame un cortado"
      srcDoc={koFiWidgetHtml}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      className="fixed bottom-4 left-2 z-[90] h-14 w-[230px] border-0 bg-transparent sm:left-4"
    />
  );
}
