using System.Windows;
using System.Windows.Controls;

namespace Prompter.VisualStudio
{
    public partial class PrompterToolWindowControl : UserControl
    {
        public PrompterToolWindowControl()
        {
            InitializeComponent();
            PromptTextBox.Text = BuildDefaultPrompt();
        }

        private static string BuildDefaultPrompt()
        {
            return string.Join(
                "\r\n",
                "Create a file.",
                "",
                "Use brief verbosity. Make the smallest useful response.",
                "Prefer existing context.",
                "Ask before making broad or cross-cutting changes.");
        }

        private void CopyPromptButton_Click(object sender, RoutedEventArgs e)
        {
            var text = PromptTextBox.Text ?? string.Empty;
            if (text.Length == 0)
            {
                Clipboard.Clear();
                return;
            }

            Clipboard.SetText(text);
        }

        private void ClearButton_Click(object sender, RoutedEventArgs e)
        {
            PromptTextBox.Clear();
            PromptTextBox.Focus();
        }
    }
}
