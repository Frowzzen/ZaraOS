import { Layout } from "@/components/layout";
import { Folder, File, HardDrive, Download, Image as ImageIcon, Music, Video, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Files() {
  const folders = [
    { name: "Documents", icon: Folder, size: "124 MB", items: 42 },
    { name: "Downloads", icon: Download, size: "1.2 GB", items: 15 },
    { name: "Pictures", icon: ImageIcon, size: "840 MB", items: 204 },
    { name: "Music", icon: Music, size: "3.4 GB", items: 850 },
    { name: "Videos", icon: Video, size: "12 GB", items: 24 },
  ];

  const recentFiles = [
    { name: "system_architecture.pdf", type: "PDF", size: "2.4 MB", date: "Today 10:42 AM" },
    { name: "api_keys.enc", type: "Encrypted", size: "12 KB", date: "Yesterday 4:15 PM" },
    { name: "ui_mockups_v2.fig", type: "Design", size: "45 MB", date: "Oct 12, 2040" },
    { name: "kernel_logs_latest.txt", type: "Log", size: "8.1 MB", date: "Oct 11, 2040" },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-6xl mx-auto gap-6">
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="border-white/10 bg-background hover:bg-white/5">
              {"<"}
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-background hover:bg-white/5">
              {">"}
            </Button>
            <div className="h-6 w-px bg-white/10 mx-2"></div>
            <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-background px-4 py-2 rounded-md border border-white/10">
              <HardDrive className="w-4 h-4 text-primary" />
              <span>/home/user/</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-mono">124.5 GB Free</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {folders.map((folder) => (
            <div key={folder.name} className="bg-card/30 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-primary/30 transition-all cursor-pointer group">
              <folder.icon className="w-12 h-12 text-primary/80 group-hover:text-primary transition-colors" />
              <div className="text-center">
                <div className="font-bold text-white group-hover:text-primary transition-colors">{folder.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{folder.items} items</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-card/20 border border-white/5 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 font-bold text-white">Recent Files</div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-black/40 font-mono">
                <tr>
                  <th className="px-6 py-3 font-normal">Name</th>
                  <th className="px-6 py-3 font-normal">Type</th>
                  <th className="px-6 py-3 font-normal">Size</th>
                  <th className="px-6 py-3 font-normal">Modified</th>
                  <th className="px-6 py-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentFiles.map((file) => (
                  <tr key={file.name} className="hover:bg-white/5 group">
                    <td className="px-6 py-4 flex items-center gap-3 text-gray-200">
                      <File className="w-4 h-4 text-primary" />
                      {file.name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{file.type}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">{file.size}</td>
                    <td className="px-6 py-4 text-muted-foreground">{file.date}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
