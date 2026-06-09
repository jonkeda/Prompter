using System.Runtime.InteropServices;
using Microsoft.VisualStudio.Shell;

namespace Prompter.VisualStudio
{
    [Guid(WindowGuidString)]
    public sealed class PrompterToolWindow : ToolWindowPane
    {
        public const string WindowGuidString = "b89d6b3a-0520-4ee9-a72e-02df4a819113";

        public PrompterToolWindow()
            : base(null)
        {
            Caption = "Prompter";
            Content = new PrompterToolWindowControl();
        }
    }
}
