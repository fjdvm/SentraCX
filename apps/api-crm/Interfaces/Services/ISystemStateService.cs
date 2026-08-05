using System.Threading.Tasks;

namespace Crm.Api.Interfaces.Services;

public interface ISystemStateService
{
    Task<object> GetGlobalSnapshotAsync();
}
