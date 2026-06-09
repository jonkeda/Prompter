using System;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Task = System.Threading.Tasks.Task;

namespace Prompter.VisualStudio
{
    [PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
    [InstalledProductRegistration("Prompter", "Compose bounded prompts and stage them from Visual Studio.", "0.1.6")]
    [ProvideMenuResource("Menus.ctmenu", 1)]
    [ProvideToolWindow(typeof(PrompterToolWindow), Style = VsDockStyle.Tabbed, Window = ToolWindowGuids80.SolutionExplorer)]
    [Guid(PackageGuidString)]
    public sealed class PrompterPackage : AsyncPackage
    {
        public const string PackageGuidString = "31c3f8bf-eb7e-47a0-876f-a3cea43cc890";

        protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
        {
            await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
            await PrompterWindowCommand.InitializeAsync(this);
        }
    }
}
