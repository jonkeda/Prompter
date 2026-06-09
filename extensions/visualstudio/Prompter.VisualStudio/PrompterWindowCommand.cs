using System;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;
using Task = System.Threading.Tasks.Task;

namespace Prompter.VisualStudio
{
    internal sealed class PrompterWindowCommand
    {
        public const int CommandId = 0x0100;
        public static readonly Guid CommandSet = new Guid("5947d250-1892-4a02-8a3a-b55b8b52f0df");

        private readonly AsyncPackage package;

        private PrompterWindowCommand(AsyncPackage package, OleMenuCommandService commandService)
        {
            this.package = package;
            var menuCommandId = new CommandID(CommandSet, CommandId);
            var menuItem = new MenuCommand(Execute, menuCommandId);
            commandService.AddCommand(menuItem);
        }

        public static async Task InitializeAsync(AsyncPackage package)
        {
            await package.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);

            var commandService = await package.GetServiceAsync(typeof(IMenuCommandService)) as OleMenuCommandService;
            if (commandService != null)
            {
                _ = new PrompterWindowCommand(package, commandService);
            }
        }

        private void Execute(object sender, EventArgs e)
        {
            _ = package.JoinableTaskFactory.RunAsync(async () =>
            {
                var window = await package.ShowToolWindowAsync(
                    typeof(PrompterToolWindow),
                    0,
                    true,
                    package.DisposalToken);

                if (window == null)
                {
                    throw new InvalidOperationException("Could not create the Prompter tool window.");
                }
            });
        }
    }
}
