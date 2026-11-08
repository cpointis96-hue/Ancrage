import AppKit
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var reportWindows: [NSWindow] = []
    private let origin = URL(string: "https://ancrage-vision.vercel.app")!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let applicationItem = NSMenuItem()
        let applicationMenu = NSMenu()
        applicationMenu.addItem(withTitle: "Quitter Ancrage", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        applicationItem.submenu = applicationMenu
        menu.addItem(applicationItem)
        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "Édition")
        for (title, action, key) in [("Couper", "cut:", "x"), ("Copier", "copy:", "c"), ("Coller", "paste:", "v"), ("Tout sélectionner", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        editItem.submenu = editMenu
        menu.addItem(editItem)
        NSApp.mainMenu = menu
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Ancrage"
        window.minSize = NSSize(width: 800, height: 600)
        window.contentView = webView
        window.setFrameAutosaveName("AncrageCockpit")
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        webView.load(URLRequest(url: origin.appendingPathComponent("cockpit")))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "https" && url.host == origin.host {
            decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow)
        } else {
            if ["https", "http", "mailto"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let response = navigationResponse.response as? HTTPURLResponse
        let attachment = response?.value(forHTTPHeaderField: "Content-Disposition")?.hasPrefix("attachment") == true
        decisionHandler(attachment ? .download : .allow)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        if let response = response as? HTTPURLResponse, response.statusCode != 200 {
            completionHandler(nil)
            showDownloadError()
            return
        }
        let folder = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        let filename = (suggestedFilename as NSString).lastPathComponent
        let original = folder.appendingPathComponent(filename)
        var destination = original
        var index = 1
        while FileManager.default.fileExists(atPath: destination.path) {
            destination = folder.appendingPathComponent("\(original.deletingPathExtension().lastPathComponent) (\(index))").appendingPathExtension(original.pathExtension)
            index += 1
        }
        completionHandler(destination)
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        if (error as NSError).code != NSURLErrorCancelled { showDownloadError() }
    }

    private func showDownloadError() {
        let alert = NSAlert()
        alert.messageText = "Téléchargement impossible"
        alert.informativeText = "Le fichier n’est pas disponible ou n’a pas pu être enregistré dans Téléchargements."
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url, url.scheme == "https" else { return nil }
        guard url.host == origin.host else { NSWorkspace.shared.open(url); return nil }
        let report = WKWebView(frame: .zero, configuration: configuration)
        report.navigationDelegate = self
        report.uiDelegate = self
        let reportWindow = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1000, height: 760), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        reportWindow.isReleasedWhenClosed = false
        reportWindow.title = "Ancrage"
        reportWindow.contentView = report
        reportWindow.center()
        reportWindow.makeKeyAndOrderFront(nil)
        reportWindows.append(reportWindow)
        return report
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        let alert = NSAlert()
        alert.messageText = "Connexion à Ancrage impossible"
        alert.informativeText = "Vérifie ta connexion Internet, puis réessaie."
        alert.addButton(withTitle: "Réessayer")
        alert.addButton(withTitle: "Quitter")
        if alert.runModal() == .alertFirstButtonReturn { webView.reload() } else { NSApp.terminate(nil) }
    }
}

let delegate = AppDelegate()
let application = NSApplication.shared
application.setActivationPolicy(.regular)
application.delegate = delegate
application.run()
